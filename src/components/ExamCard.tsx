import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Calendar, BookOpen } from 'lucide-react';
import { Exam, ExamStatus, ExamDifficulty } from '@/types/exam';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 考试卡片组件属性接口
 */
interface ExamCardProps {
  /** 考试信息 */
  exam: Exam;
  /** 点击查看详情的回调函数 */
  onViewDetails?: (examId: string) => void;
  /** 点击参加考试的回调函数 */
  onJoinExam?: (examId: string) => void;
  /** 点击编辑考试的回调函数 */
  onEditExam?: (examId: string) => void;
  /** 是否显示管理操作按钮 */
  showAdminActions?: boolean;
  /** 当前用户是否已报名 */
  isEnrolled?: boolean;
  /** 是否正在加载 */
  loading?: boolean;
}

/**
 * 获取考试状态的显示样式
 * @param status 考试状态
 * @returns 状态样式配置
 */
const getStatusConfig = (status: ExamStatus) => {
  switch (status) {
    case ExamStatus.DRAFT:
      return { variant: 'secondary' as const, label: '草稿' };
    case ExamStatus.PUBLISHED:
      return { variant: 'default' as const, label: '已发布' };
    case ExamStatus.IN_PROGRESS:
      return { variant: 'destructive' as const, label: '进行中' };
    case ExamStatus.COMPLETED:
      return { variant: 'outline' as const, label: '已结束' };
    case ExamStatus.ARCHIVED:
      return { variant: 'secondary' as const, label: '已归档' };
    default:
      return { variant: 'secondary' as const, label: '未知' };
  }
};

/**
 * 获取难度等级的显示样式
 * @param difficulty 难度等级
 * @returns 难度样式配置
 */
const getDifficultyConfig = (difficulty: ExamDifficulty) => {
  switch (difficulty) {
    case ExamDifficulty.EASY:
      return { variant: 'default' as const, label: '简单', color: 'text-green-600' };
    case ExamDifficulty.MEDIUM:
      return { variant: 'secondary' as const, label: '中等', color: 'text-yellow-600' };
    case ExamDifficulty.HARD:
      return { variant: 'destructive' as const, label: '困难', color: 'text-red-600' };
    default:
      return { variant: 'outline' as const, label: '未知', color: 'text-gray-600' };
  }
};

/**
 * 考试卡片组件
 * @description 用于显示考试信息的卡片组件，支持查看详情、参加考试等操作
 * @param props 组件属性
 * @returns JSX.Element
 */
export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  onViewDetails,
  onJoinExam,
  onEditExam,
  showAdminActions = false,
  isEnrolled = false,
  loading = false
}) => {
  const statusConfig = getStatusConfig(exam.status);
  const difficultyConfig = getDifficultyConfig(exam.difficulty);

  /**
   * 处理查看详情点击事件
   */
  const handleViewDetails = () => {
    if (onViewDetails && !loading) {
      onViewDetails(exam.id);
    }
  };

  /**
   * 处理参加考试点击事件
   */
  const handleJoinExam = () => {
    if (onJoinExam && !loading) {
      onJoinExam(exam.id);
    }
  };

  /**
   * 处理编辑考试点击事件
   */
  const handleEditExam = () => {
    if (onEditExam && !loading) {
      onEditExam(exam.id);
    }
  };

  /**
   * 判断考试是否可以参加
   */
  const canJoinExam = () => {
    if (exam.status !== ExamStatus.PUBLISHED) return false;
    if (exam.start_time && new Date(exam.start_time) > new Date()) return false;
    if (exam.end_time && new Date(exam.end_time) < new Date()) return false;
    return true;
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${loading ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
              {exam.title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
              <Badge variant={difficultyConfig.variant} className={difficultyConfig.color}>
                {difficultyConfig.label}
              </Badge>
              {exam.category && (
                <Badge variant="outline">
                  {exam.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {exam.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {exam.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {exam.duration ? `${exam.duration}分钟` : '不限时'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>
              {exam.total_questions || 0}题
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {exam.max_participants ? `限${exam.max_participants}人` : '不限人数'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {exam.start_time
                ? format(new Date(exam.start_time), 'MM-dd HH:mm', { locale: zhCN })
                : '随时开始'
              }
            </span>
          </div>
        </div>

        {exam.end_time && (
          <div className="mt-3 text-xs text-muted-foreground">
            截止时间：{format(new Date(exam.end_time), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground">
            {exam.created_at && (
              <span>
                创建于 {formatDistanceToNow(new Date(exam.created_at), {
                  addSuffix: true,
                  locale: zhCN
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
              disabled={loading}
            >
              查看详情
            </Button>

            {showAdminActions ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleEditExam}
                disabled={loading}
              >
                编辑
              </Button>
            ) : (
              canJoinExam() && (
                <Button
                  variant={isEnrolled ? "secondary" : "default"}
                  size="sm"
                  onClick={handleJoinExam}
                  disabled={loading}
                >
                  {isEnrolled ? '继续考试' : '参加考试'}
                </Button>
              )
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ExamCard;