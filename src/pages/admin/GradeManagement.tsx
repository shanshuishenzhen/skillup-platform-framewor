/**
 * 成绩管理页面
 * 
 * 提供管理员成绩管理功能，包括：
 * - 成绩列表查看和筛选
 * - 成绩搜索和排序
 * - 成绩编辑和批量操作
 * - 成绩统计和分析
 * - 成绩导出功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  MoreHorizontal,
  ChevronDown,
  Calendar,
  Users,
  TrendingUp,
  Award,
  FileText,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Grade,
  GradeStatus,
  GradeLevel,
  GradeQueryParams,
  GradeQueryResponse,
  GradeStats
} from '@/types/grade';
import { gradeService } from '@/services/gradeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';

/**
 * 成绩状态配置
 */
const GRADE_STATUS_CONFIG = {
  [GradeStatus.PENDING]: {
    label: '待评分',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏳'
  },
  [GradeStatus.GRADING]: {
    label: '评分中',
    color: 'bg-blue-100 text-blue-800',
    icon: '📝'
  },
  [GradeStatus.GRADED]: {
    label: '已评分',
    color: 'bg-green-100 text-green-800',
    icon: '✅'
  },
  [GradeStatus.PUBLISHED]: {
    label: '已发布',
    color: 'bg-purple-100 text-purple-800',
    icon: '📢'
  },
  [GradeStatus.ARCHIVED]: {
    label: '已归档',
    color: 'bg-gray-100 text-gray-800',
    icon: '📦'
  }
};

/**
 * 成绩等级配置
 */
const GRADE_LEVEL_CONFIG = {
  [GradeLevel.EXCELLENT]: {
    label: '优秀',
    color: 'bg-green-100 text-green-800',
    icon: '🏆'
  },
  [GradeLevel.GOOD]: {
    label: '良好',
    color: 'bg-blue-100 text-blue-800',
    icon: '👍'
  },
  [GradeLevel.AVERAGE]: {
    label: '中等',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '👌'
  },
  [GradeLevel.PASS]: {
    label: '及格',
    color: 'bg-orange-100 text-orange-800',
    icon: '✓'
  },
  [GradeLevel.FAIL]: {
    label: '不及格',
    color: 'bg-red-100 text-red-800',
    icon: '❌'
  }
};

/**
 * 成绩管理页面组件
 */
export default function GradeManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 辅助函数：更新URL参数
  const updateSearchParams = (newParams: Partial<GradeQueryParams>) => {
    if (!searchParams) return;
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        current.set(key, value.toString());
      } else {
        current.delete(key);
      }
    });
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${router.pathname}${query}`, undefined, { shallow: true });
  };
  
  // 状态管理
  const [grades, setGrades] = useState<Grade[]>([]);
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // 查询参数
  const [queryParams, setQueryParams] = useState<GradeQueryParams>({
    page: parseInt(searchParams?.get('page') || '1'),
    limit: parseInt(searchParams?.get('limit') || '20'),
    search: searchParams?.get('search') || '',
    status: searchParams?.get('status') as GradeStatus || undefined,
    grade_level: searchParams?.get('grade_level') as GradeLevel || undefined,
    exam_id: searchParams?.get('exam_id') || undefined,
    sort_by: searchParams?.get('sort_by') || 'created_at',
    sort_order: (searchParams?.get('sort_order') as 'asc' | 'desc') || 'desc'
  });
  
  // 分页信息
  const [pagination, setPagination] = useState({
    total: 0,
    total_pages: 0
  });

  /**
   * 加载成绩列表
   */
  const loadGrades = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response: GradeQueryResponse = await gradeService.getGrades(queryParams);
      
      setGrades(response.grades);
      setPagination({
        total: response.total,
        total_pages: response.total_pages
      });
      
      // 更新URL参数
      updateSearchParams(queryParams);
      
    } catch (error) {
      console.error('加载成绩列表失败:', error);
      toast.error('加载成绩列表失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryParams, updateSearchParams]);

  /**
   * 加载统计信息
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await gradeService.getGradeStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

  /**
   * 处理搜索
   */
  const handleSearch = useCallback((search: string) => {
    setQueryParams(prev => ({
      ...prev,
      search,
      page: 1
    }));
  }, []);

  /**
   * 处理筛选
   */
  const handleFilter = useCallback((key: string, value: any) => {
    setQueryParams(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  }, []);

  /**
   * 处理排序
   */
  const handleSort = useCallback((sortBy: string) => {
    setQueryParams(prev => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  }, []);

  /**
   * 处理分页
   */
  const handlePageChange = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  /**
   * 处理选择
   */
  const handleSelectGrade = useCallback((gradeId: string, checked: boolean) => {
    setSelectedGrades(prev => 
      checked 
        ? [...prev, gradeId]
        : prev.filter(id => id !== gradeId)
    );
  }, []);

  /**
   * 处理全选
   */
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedGrades(checked ? grades.map(grade => grade.id) : []);
  }, [grades]);

  /**
   * 处理批量操作
   */
  const handleBatchAction = useCallback(async (action: string) => {
    if (selectedGrades.length === 0) {
      toast.warning('请先选择要操作的成绩');
      return;
    }

    try {
      switch (action) {
        case 'publish':
          await gradeService.batchUpdateGrades({
            grade_ids: selectedGrades,
            updates: { status: GradeStatus.PUBLISHED }
          });
          toast.success('批量发布成功');
          break;
        case 'archive':
          await gradeService.batchUpdateGrades({
            grade_ids: selectedGrades,
            updates: { status: GradeStatus.ARCHIVED }
          });
          toast.success('批量归档成功');
          break;
        default:
          toast.error('未知操作');
          return;
      }
      
      setSelectedGrades([]);
      await loadGrades(false);
    } catch (error) {
      console.error('批量操作失败:', error);
      toast.error('批量操作失败，请重试');
    }
  }, [selectedGrades, loadGrades]);

  /**
   * 处理导出
   */
  const handleExport = useCallback(async () => {
    try {
      toast.info('导出功能开发中...');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  }, []);

  /**
   * 格式化分数显示
   */
  const formatScore = useCallback((score: number, maxScore: number) => {
    return `${score}/${maxScore}`;
  }, []);

  /**
   * 格式化百分比显示
   */
  const formatPercentage = useCallback((percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  }, []);

  /**
   * 格式化时间显示
   */
  const formatTime = useCallback((timeSpent?: number) => {
    if (!timeSpent) return '-';
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // 初始化加载
  useEffect(() => {
    loadGrades();
    loadStats();
  }, [loadGrades, loadStats]);

  // 渲染统计卡片
  const renderStatsCards = () => {
    if (!stats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总参与人数</p>
                <p className="text-2xl font-bold">{stats.total_participants}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">通过率</p>
                <p className="text-2xl font-bold">{formatPercentage(stats.pass_rate)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均分</p>
                <p className="text-2xl font-bold">{stats.average_score.toFixed(1)}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">最高分</p>
                <p className="text-2xl font-bold">{stats.highest_score}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 渲染筛选器
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <Select
                value={queryParams.status || ''}
                onValueChange={(value) => handleFilter('status', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部状态</SelectItem>
                  {Object.entries(GRADE_STATUS_CONFIG).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                等级
              </label>
              <Select
                value={queryParams.grade_level || ''}
                onValueChange={(value) => handleFilter('grade_level', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部等级</SelectItem>
                  {Object.entries(GRADE_LEVEL_CONFIG).map(([level, config]) => (
                    <SelectItem key={level} value={level}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                是否通过
              </label>
              <Select
                value={queryParams.passed?.toString() || ''}
                onValueChange={(value) => handleFilter('passed', value ? value === 'true' : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择通过状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  <SelectItem value="true">已通过</SelectItem>
                  <SelectItem value="false">未通过</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每页显示
              </label>
              <Select
                value={queryParams.limit?.toString() || '20'}
                onValueChange={(value) => handleFilter('limit', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10条</SelectItem>
                  <SelectItem value="20">20条</SelectItem>
                  <SelectItem value="50">50条</SelectItem>
                  <SelectItem value="100">100条</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染表格
  const renderTable = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedGrades.length === grades.length && grades.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('users.name')}
                >
                  学员姓名
                  {queryParams.sort_by === 'users.name' && (
                    <ChevronDown className={`inline ml-1 h-4 w-4 ${queryParams.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('exams.title')}
                >
                  考试名称
                  {queryParams.sort_by === 'exams.title' && (
                    <ChevronDown className={`inline ml-1 h-4 w-4 ${queryParams.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('score')}
                >
                  分数
                  {queryParams.sort_by === 'score' && (
                    <ChevronDown className={`inline ml-1 h-4 w-4 ${queryParams.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                  )}
                </TableHead>
                <TableHead>百分比</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>用时</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('created_at')}
                >
                  提交时间
                  {queryParams.sort_by === 'created_at' && (
                    <ChevronDown className={`inline ml-1 h-4 w-4 ${queryParams.sort_order === 'asc' ? 'rotate-180' : ''}`} />
                  )}
                </TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((grade) => {
                const statusConfig = GRADE_STATUS_CONFIG[grade.status];
                const levelConfig = GRADE_LEVEL_CONFIG[grade.grade_level];
                
                return (
                  <TableRow key={grade.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedGrades.includes(grade.id)}
                        onCheckedChange={(checked) => handleSelectGrade(grade.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {grade.user?.avatar && (
                          <img
                            src={grade.user.avatar}
                            alt={grade.user.name}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium">{grade.user?.name}</p>
                          <p className="text-sm text-gray-500">{grade.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{grade.exam?.title}</p>
                        <p className="text-sm text-gray-500">
                          {grade.exam?.category} · {grade.exam?.difficulty}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        grade.passed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatScore(grade.score, grade.max_score)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        grade.passed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(grade.percentage)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={levelConfig.color}>
                        {levelConfig.icon} {levelConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        {statusConfig.icon} {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatTime(grade.time_spent)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(grade.created_at).toLocaleDateString()}</p>
                        <p className="text-gray-500">
                          {new Date(grade.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑成绩
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {grades.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无成绩数据</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成绩管理</h1>
          <p className="text-gray-600">管理和分析考试成绩</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => loadGrades(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {renderStatsCards()}

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索学员姓名、邮箱或考试名称..."
                  value={queryParams.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 筛选器 */}
      {renderFilters()}

      {/* 批量操作 */}
      {selectedGrades.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                已选择 {selectedGrades.length} 项
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchAction('publish')}
                >
                  批量发布
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchAction('archive')}
                >
                  批量归档
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 成绩表格 */}
      {renderTable()}

      {/* 分页 */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={queryParams.page || 1}
            totalPages={pagination.total_pages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}