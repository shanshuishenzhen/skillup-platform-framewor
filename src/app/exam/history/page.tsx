'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Trophy, 
  Search, 
  Filter,
  Eye,
  Download,
  Calendar,
  TrendingUp,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { Exam } from '@/types/exam';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatTime, formatDateTime } from '@/utils/format';
import Link from 'next/link';

interface ExamRecord {
  id: string;
  exam: Exam;
  score: number;
  total_score: number;
  percentage: number;
  time_used: number;
  submitted_at: string;
  graded_at?: string;
  status: 'completed' | 'graded' | 'pending';
  rank?: number;
  total_participants?: number;
}

interface ExamStats {
  total_exams: number;
  completed_exams: number;
  average_score: number;
  highest_score: number;
  total_time_spent: number;
  improvement_trend: number;
}

/**
 * 考试历史记录页面组件
 * 显示用户的所有考试记录、成绩统计和趋势分析
 */
export default function ExamHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // 状态管理
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ExamRecord[]>([]);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  /**
   * 获取考试历史记录
   */
  const fetchExamHistory = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/exams/history');
      const result = await response.json();
      
      if (!result.success) {
        toast.error('获取考试历史失败');
        return;
      }
      
      setRecords(result.data.records || []);
      setStats(result.data.stats || null);
      
    } catch (error) {
      console.error('获取考试历史失败:', error);
      toast.error('获取考试历史失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 过滤和排序记录
   */
  const filterAndSortRecords = () => {
    let filtered = records.filter(record => {
      // 搜索过滤
      const matchesSearch = searchTerm === '' || 
        record.exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 状态过滤
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        case 'date_asc':
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        case 'score_desc':
          return b.percentage - a.percentage;
        case 'score_asc':
          return a.percentage - b.percentage;
        case 'title_asc':
          return a.exam.title.localeCompare(b.exam.title);
        case 'title_desc':
          return b.exam.title.localeCompare(a.exam.title);
        default:
          return 0;
      }
    });
    
    setFilteredRecords(filtered);
  };

  /**
   * 获取成绩等级
   */
  const getGradeInfo = (percentage: number) => {
    if (percentage >= 90) {
      return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (percentage >= 80) {
      return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (percentage >= 70) {
      return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else if (percentage >= 60) {
      return { grade: 'D', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else {
      return { grade: 'F', color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };

  /**
   * 获取状态显示信息
   */
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: '已完成', color: 'bg-blue-100 text-blue-800' };
      case 'graded':
        return { text: '已评分', color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { text: '待评分', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { text: '未知', color: 'bg-gray-100 text-gray-800' };
    }
  };

  /**
   * 导出考试记录
   */
  const handleExportRecords = () => {
    // 这里可以实现导出功能
    toast.info('导出功能开发中');
  };

  // 组件挂载时获取数据
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchExamHistory();
  }, [user]);

  // 过滤条件变化时重新过滤
  useEffect(() => {
    filterAndSortRecords();
  }, [records, searchTerm, statusFilter, sortBy]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试历史中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">考试历史</h1>
          <p className="text-gray-600 mt-1">查看您的所有考试记录和成绩统计</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportRecords}>
            <Download className="w-4 h-4 mr-2" />
            导出记录
          </Button>
          <Link href="/exams">
            <Button>
              <BookOpen className="w-4 h-4 mr-2" />
              参加考试
            </Button>
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总考试数</p>
                  <p className="text-3xl font-bold">{stats.total_exams}</p>
                  <p className="text-sm text-gray-600">已完成 {stats.completed_exams}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">平均分</p>
                  <p className="text-3xl font-bold">{stats.average_score.toFixed(1)}%</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className={`w-4 h-4 mr-1 ${
                      stats.improvement_trend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`text-sm ${
                      stats.improvement_trend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stats.improvement_trend >= 0 ? '+' : ''}{stats.improvement_trend.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Trophy className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">最高分</p>
                  <p className="text-3xl font-bold">{stats.highest_score.toFixed(1)}%</p>
                  <Badge className={getGradeInfo(stats.highest_score).bgColor + ' ' + getGradeInfo(stats.highest_score).color + ' mt-1'}>
                    等级 {getGradeInfo(stats.highest_score).grade}
                  </Badge>
                </div>
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总用时</p>
                  <p className="text-3xl font-bold">{formatTime(stats.total_time_spent)}</p>
                  <p className="text-sm text-gray-600">
                    平均 {stats.completed_exams > 0 ? formatTime(Math.floor(stats.total_time_spent / stats.completed_exams)) : '0分钟'}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 过滤和搜索 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索考试名称或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="graded">已评分</SelectItem>
                  <SelectItem value="pending">待评分</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">最新优先</SelectItem>
                  <SelectItem value="date_asc">最早优先</SelectItem>
                  <SelectItem value="score_desc">高分优先</SelectItem>
                  <SelectItem value="score_asc">低分优先</SelectItem>
                  <SelectItem value="title_asc">标题A-Z</SelectItem>
                  <SelectItem value="title_desc">标题Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 考试记录列表 */}
      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {records.length === 0 ? '暂无考试记录' : '没有找到匹配的记录'}
              </h3>
              <p className="text-gray-600 mb-4">
                {records.length === 0 
                  ? '您还没有参加过任何考试，快去参加考试吧！' 
                  : '请尝试调整搜索条件或过滤器'
                }
              </p>
              {records.length === 0 && (
                <Link href="/exams">
                  <Button>
                    <BookOpen className="w-4 h-4 mr-2" />
                    参加考试
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => {
            const gradeInfo = getGradeInfo(record.percentage);
            const statusInfo = getStatusInfo(record.status);
            
            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold">{record.exam.title}</h3>
                          <p className="text-gray-600 text-sm mt-1">{record.exam.description}</p>
                        </div>
                        <Badge className={statusInfo.color}>
                          {statusInfo.text}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDateTime(record.submitted_at)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          用时 {formatTime(record.time_used)}
                        </div>
                        {record.rank && record.total_participants && (
                          <div className="flex items-center">
                            <Trophy className="w-4 h-4 mr-1" />
                            排名 {record.rank}/{record.total_participants}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{record.percentage.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600">
                          {record.score}/{record.total_score} 分
                        </div>
                        <Badge className={`${gradeInfo.bgColor} ${gradeInfo.color} mt-1`}>
                          等级 {gradeInfo.grade}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <Link href={`/exam/${record.exam.id}/result`}>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            查看详情
                          </Button>
                        </Link>
                        
                        {record.exam.allow_review && (
                          <Link href={`/exam/${record.exam.id}/review`}>
                            <Button size="sm" variant="ghost">
                              复习错题
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* 分页 */}
      {filteredRecords.length > 10 && (
        <div className="mt-8 flex justify-center">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              分页功能开发中，当前显示所有记录
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}