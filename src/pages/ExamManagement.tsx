import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  FileText, 
  BarChart3,
  Calendar,
  Clock,
  Target,
  Award,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 考试状态枚举
 */
enum ExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * 考试难度枚举
 */
enum ExamDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * 考试数据接口
 */
interface Exam {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: ExamDifficulty;
  status: ExamStatus;
  duration: number; // 分钟
  total_questions: number;
  total_score: number;
  passing_score: number;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
  // 统计信息
  registered_count?: number;
  completed_count?: number;
  passed_count?: number;
}

/**
 * 考试管理页面组件
 * 提供考试的创建、编辑、删除、查看等功能
 */
const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  /**
   * 获取考试列表
   */
  const fetchExams = async () => {
    try {
      setLoading(true);
      // TODO: 实现API调用
      // const response = await examService.getExams();
      // setExams(response.data);
      
      // 模拟数据
      const mockExams: Exam[] = [
        {
          id: '1',
          title: 'JavaScript基础考试',
          description: '测试JavaScript基础知识掌握情况',
          category: '前端开发',
          difficulty: ExamDifficulty.BEGINNER,
          status: ExamStatus.PUBLISHED,
          duration: 60,
          total_questions: 20,
          total_score: 100,
          passing_score: 60,
          start_time: '2024-01-15T09:00:00Z',
          end_time: '2024-01-15T18:00:00Z',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z',
          registered_count: 45,
          completed_count: 32,
          passed_count: 28
        },
        {
          id: '2',
          title: 'React高级开发',
          description: 'React框架高级特性和最佳实践',
          category: '前端开发',
          difficulty: ExamDifficulty.ADVANCED,
          status: ExamStatus.ACTIVE,
          duration: 90,
          total_questions: 30,
          total_score: 150,
          passing_score: 90,
          start_time: '2024-01-20T09:00:00Z',
          end_time: '2024-01-20T18:00:00Z',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          registered_count: 23,
          completed_count: 15,
          passed_count: 12
        }
      ];
      setExams(mockExams);
    } catch (error) {
      console.error('获取考试列表失败:', error);
      toast.error('获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取状态显示文本
   */
  const getStatusText = (status: ExamStatus): string => {
    const statusMap = {
      [ExamStatus.DRAFT]: '草稿',
      [ExamStatus.PUBLISHED]: '已发布',
      [ExamStatus.ACTIVE]: '进行中',
      [ExamStatus.COMPLETED]: '已结束',
      [ExamStatus.ARCHIVED]: '已归档'
    };
    return statusMap[status];
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: ExamStatus): string => {
    const colorMap = {
      [ExamStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [ExamStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
      [ExamStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [ExamStatus.COMPLETED]: 'bg-yellow-100 text-yellow-800',
      [ExamStatus.ARCHIVED]: 'bg-red-100 text-red-800'
    };
    return colorMap[status];
  };

  /**
   * 获取难度显示文本
   */
  const getDifficultyText = (difficulty: ExamDifficulty): string => {
    const difficultyMap = {
      [ExamDifficulty.BEGINNER]: '初级',
      [ExamDifficulty.INTERMEDIATE]: '中级',
      [ExamDifficulty.ADVANCED]: '高级',
      [ExamDifficulty.EXPERT]: '专家'
    };
    return difficultyMap[difficulty];
  };

  /**
   * 获取难度颜色
   */
  const getDifficultyColor = (difficulty: ExamDifficulty): string => {
    const colorMap = {
      [ExamDifficulty.BEGINNER]: 'bg-green-100 text-green-800',
      [ExamDifficulty.INTERMEDIATE]: 'bg-blue-100 text-blue-800',
      [ExamDifficulty.ADVANCED]: 'bg-orange-100 text-orange-800',
      [ExamDifficulty.EXPERT]: 'bg-red-100 text-red-800'
    };
    return colorMap[difficulty];
  };

  /**
   * 过滤考试列表
   */
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    const matchesDifficulty = difficultyFilter === 'all' || exam.difficulty === difficultyFilter;
    
    return matchesSearch && matchesStatus && matchesDifficulty;
  });

  /**
   * 处理删除考试
   */
  const handleDeleteExam = async (examId: string) => {
    if (!confirm('确定要删除这个考试吗？此操作不可撤销。')) {
      return;
    }

    try {
      // TODO: 实现API调用
      // await examService.deleteExam(examId);
      setExams(exams.filter(exam => exam.id !== examId));
      toast.success('考试删除成功');
    } catch (error) {
      console.error('删除考试失败:', error);
      toast.error('删除考试失败');
    }
  };

  /**
   * 处理编辑考试
   */
  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setIsEditDialogOpen(true);
  };

  /**
   * 计算通过率
   */
  const calculatePassRate = (exam: Exam): string => {
    if (!exam.completed_count || exam.completed_count === 0) {
      return '0%';
    }
    const rate = ((exam.passed_count || 0) / exam.completed_count) * 100;
    return `${rate.toFixed(1)}%`;
  };

  useEffect(() => {
    fetchExams();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">考试管理</h1>
          <p className="text-gray-600 mt-2">创建和管理在线考试</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          创建考试
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总考试数</p>
                <p className="text-2xl font-bold">{exams.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总报名人数</p>
                <p className="text-2xl font-bold">
                  {exams.reduce((sum, exam) => sum + (exam.registered_count || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">完成人数</p>
                <p className="text-2xl font-bold">
                  {exams.reduce((sum, exam) => sum + (exam.completed_count || 0), 0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">通过人数</p>
                <p className="text-2xl font-bold">
                  {exams.reduce((sum, exam) => sum + (exam.passed_count || 0), 0)}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索考试标题、描述或分类..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value={ExamStatus.DRAFT}>草稿</SelectItem>
                <SelectItem value={ExamStatus.PUBLISHED}>已发布</SelectItem>
                <SelectItem value={ExamStatus.ACTIVE}>进行中</SelectItem>
                <SelectItem value={ExamStatus.COMPLETED}>已结束</SelectItem>
                <SelectItem value={ExamStatus.ARCHIVED}>已归档</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="选择难度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有难度</SelectItem>
                <SelectItem value={ExamDifficulty.BEGINNER}>初级</SelectItem>
                <SelectItem value={ExamDifficulty.INTERMEDIATE}>中级</SelectItem>
                <SelectItem value={ExamDifficulty.ADVANCED}>高级</SelectItem>
                <SelectItem value={ExamDifficulty.EXPERT}>专家</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 考试列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredExams.map((exam) => (
          <Card key={exam.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{exam.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{exam.category}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(exam.status)}>
                    {getStatusText(exam.status)}
                  </Badge>
                  <Badge className={getDifficultyColor(exam.difficulty)}>
                    {getDifficultyText(exam.difficulty)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{exam.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{exam.duration}分钟</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span>{exam.total_questions}题</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-400" />
                  <span>{exam.total_score}分</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-gray-400" />
                  <span>及格{exam.passing_score}分</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-center mb-4">
                <div>
                  <div className="font-medium">{exam.registered_count || 0}</div>
                  <div className="text-gray-500">报名</div>
                </div>
                <div>
                  <div className="font-medium">{exam.completed_count || 0}</div>
                  <div className="text-gray-500">完成</div>
                </div>
                <div>
                  <div className="font-medium">{calculatePassRate(exam)}</div>
                  <div className="text-gray-500">通过率</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditExam(exam)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* TODO: 查看统计 */}}
                  className="flex-1"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  统计
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteExam(exam.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExams.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无考试</h3>
            <p className="text-gray-600 mb-4">还没有创建任何考试，点击上方按钮创建第一个考试。</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建考试
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 创建考试对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建新考试</DialogTitle>
          </DialogHeader>
          {/* TODO: 实现创建考试表单 */}
          <div className="p-4 text-center text-gray-500">
            创建考试表单将在下一步实现
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑考试对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑考试</DialogTitle>
          </DialogHeader>
          {/* TODO: 实现编辑考试表单 */}
          <div className="p-4 text-center text-gray-500">
            编辑考试表单将在下一步实现
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamManagement;