'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Filter, BookOpen, Users, Clock } from 'lucide-react';
import { ExamCard } from '@/components/ExamCard';
import { Exam, ExamStatus, ExamDifficulty } from '@/types/exam';
import { toast } from 'sonner';
import { supabase, getCurrentUser } from '@/services/supabaseClient';

/**
 * 考试列表页面组件
 * @description 显示考试列表，支持搜索、筛选和管理功能
 * @returns JSX.Element
 */
const ExamsPage: React.FC = () => {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /**
   * 获取当前用户信息
   */
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        // 这里可以根据用户角色判断是否为管理员
        // 暂时假设所有登录用户都是管理员
        setIsAdmin(!!user);
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  /**
   * 获取考试列表
   */
  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/exams');
      
      if (!response.ok) {
        throw new Error('获取考试列表失败');
      }

      const data = await response.json();
      setExams(data.exams || []);
      
      // 提取分类列表
      const uniqueCategories = Array.from(
        new Set(data.exams?.map((exam: Exam) => exam.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('获取考试列表失败:', error);
      toast.error('获取考试列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化数据
   */
  useEffect(() => {
    fetchExams();
  }, []);

  /**
   * 筛选考试列表
   */
  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (exam.description && exam.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || exam.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || exam.difficulty === selectedDifficulty;
    const matchesStatus = selectedStatus === 'all' || exam.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
  });

  /**
   * 处理查看考试详情
   * @param examId 考试ID
   */
  const handleViewDetails = (examId: string) => {
    router.push(`/exams/${examId}`);
  };

  /**
   * 处理参加考试
   * @param examId 考试ID
   */
  const handleJoinExam = async (examId: string) => {
    if (!currentUser) {
      toast.error('请先登录');
      router.push('/auth/login');
      return;
    }

    try {
      // 检查是否已报名
      const response = await fetch(`/api/exams/${examId}/participate`);
      
      if (response.ok) {
        // 已报名，直接进入考试
        router.push(`/exams/${examId}/take`);
      } else if (response.status === 404) {
        // 未报名，先报名
        const enrollResponse = await fetch(`/api/exams/${examId}/participate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (enrollResponse.ok) {
          toast.success('报名成功');
          router.push(`/exams/${examId}/take`);
        } else {
          const errorData = await enrollResponse.json();
          toast.error(errorData.message || '报名失败');
        }
      } else {
        throw new Error('检查报名状态失败');
      }
    } catch (error) {
      console.error('参加考试失败:', error);
      toast.error('操作失败，请重试');
    }
  };

  /**
   * 处理编辑考试
   * @param examId 考试ID
   */
  const handleEditExam = (examId: string) => {
    router.push(`/admin/exams/${examId}/edit`);
  };

  /**
   * 处理创建新考试
   */
  const handleCreateExam = () => {
    router.push('/admin/exams/create');
  };

  /**
   * 重置筛选条件
   */
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSelectedStatus('all');
  };

  /**
   * 获取状态统计
   */
  const getStatusStats = () => {
    const stats = {
      total: exams.length,
      published: exams.filter(exam => exam.status === ExamStatus.PUBLISHED).length,
      inProgress: exams.filter(exam => exam.status === ExamStatus.IN_PROGRESS).length,
      completed: exams.filter(exam => exam.status === ExamStatus.COMPLETED).length
    };
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">考试中心</h1>
          <p className="text-muted-foreground">
            浏览和参加各类考试，提升您的技能水平
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreateExam} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            创建考试
          </Button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">总考试数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">已发布</p>
                <p className="text-2xl font-bold">{stats.published}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">已结束</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索考试标题或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="选择难度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部难度</SelectItem>
                <SelectItem value={ExamDifficulty.EASY}>简单</SelectItem>
                <SelectItem value={ExamDifficulty.MEDIUM}>中等</SelectItem>
                <SelectItem value={ExamDifficulty.HARD}>困难</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value={ExamStatus.PUBLISHED}>已发布</SelectItem>
                <SelectItem value={ExamStatus.IN_PROGRESS}>进行中</SelectItem>
                <SelectItem value={ExamStatus.COMPLETED}>已结束</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              找到 {filteredExams.length} 个考试
            </p>
            <Button variant="outline" onClick={resetFilters}>
              重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 考试列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无考试</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedStatus !== 'all'
                ? '没有找到符合条件的考试，请尝试调整筛选条件'
                : '还没有创建任何考试'}
            </p>
            {isAdmin && (
              <Button onClick={handleCreateExam}>
                创建第一个考试
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onViewDetails={handleViewDetails}
              onJoinExam={handleJoinExam}
              onEditExam={handleEditExam}
              showAdminActions={isAdmin}
              loading={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamsPage;