'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, Clock, Award, DollarSign } from 'lucide-react';
import { aiDataGeneratorService } from '@/services/aiDataGeneratorService';
import type { VirtualTraining } from '@/services/aiDataGeneratorService';

export default function TrainingPage() {
  const [trainingCourses, setTrainingCourses] = useState<VirtualTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载培训数据
  const loadTraining = async () => {
    try {
      setLoading(true);
      const virtualTraining = await aiDataGeneratorService.generateTraining(9);
      setTrainingCourses(virtualTraining);
    } catch (error) {
      console.error('加载培训数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新培训数据
  const refreshTraining = async () => {
    try {
      setRefreshing(true);
      const virtualTraining = await aiDataGeneratorService.generateTraining(9, true);
      setTrainingCourses(virtualTraining);
    } catch (error) {
      console.error('刷新培训数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadTraining();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">技能培训</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              AI生成的职业技能培训项目，展示多样化的培训内容
            </p>
            <div className="mt-6">
              <button
                onClick={refreshTraining}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? '刷新中...' : '刷新培训数据'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 课程列表 */}
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">培训课程</h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">加载培训数据中...</span>
          </div>
        ) : trainingCourses.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无培训课程</h3>
            <p className="text-gray-500 mb-6">请稍后再试或点击刷新按钮重新加载</p>
            <button
              onClick={loadTraining}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trainingCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative h-48 overflow-hidden">
                  <Image 
                    src={course.image} 
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/api/placeholder/300/200';
                    }}
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                      {course.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-gray-900 line-clamp-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3 text-sm leading-relaxed">{course.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center">
                        <Award className="w-4 h-4 mr-1" />
                        <span>{course.level}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-lg font-bold text-blue-600">
                      <DollarSign className="w-5 h-5" />
                      <span>{course.price}</span>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-gray-900">课程特色：</h4>
                    <div className="flex flex-wrap gap-2">
                      {course.features.map((feature, index) => (
                        <span key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium">
                      咨询客服
                    </button>
                    <Link 
                      href={`/training/${course.id}`}
                      className="flex-1 border-2 border-blue-600 text-blue-600 py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors font-medium text-center"
                    >
                      查看详情
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 培训优势 */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 py-16 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">培训优势</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🎓</span>
                </div>
                <h3 className="font-bold mb-3 text-gray-900">AI智能认证</h3>
                <p className="text-gray-600 text-sm leading-relaxed">智能化职业技能认证体系</p>
              </div>
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="font-bold mb-3 text-gray-900">专业导师</h3>
                <p className="text-gray-600 text-sm leading-relaxed">AI生成的专业导师团队</p>
              </div>
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">💡</span>
                </div>
                <h3 className="font-bold mb-3 text-gray-900">智能推荐</h3>
                <p className="text-gray-600 text-sm leading-relaxed">个性化学习路径规划</p>
              </div>
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="font-bold mb-3 text-gray-900">实战演练</h3>
                <p className="text-gray-600 text-sm leading-relaxed">模拟真实项目的实践环境</p>
              </div>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-8">开启学习之旅</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
              体验AI生成的培训内容，探索未来教育的无限可能
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg">
                体验咨询
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-200 transform hover:scale-105">
                探索更多课程
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}