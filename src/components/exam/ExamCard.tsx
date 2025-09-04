'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, FileText, Calendar, Play, Edit, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { Exam, ExamStatus } from '@/types/exam';
import { formatDuration, formatDateTime } from '@/utils/format';
import { ExamService } from '@/services/examService';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExamCardProps {
  /** 考试数据 */
  exam: Exam;
  /** 是否显示管理操作按钮 */
  showActions?: boolean;
  /** 编辑考试回调函数 */
  onEdit?: (exam: Exam) => void;
  /** 删除考试回调函数 */
  onDelete?: (examId: string) => void;
  /** 用户是否已参与考试 */
  isParticipated?: boolean;
  /** 用户考试状态 */
  userStatus?: 'not_started' | 'in_progress' | 'completed' | 'paused';
}

/**
 * 考试卡片组件
 * 用于展示考试信息，支持不同的显示模式和操作
 * 
 * @param exam - 考试数据对象
 * @param showActions - 是否显示管理操作按钮（编辑、删除）
 * @param onEdit - 编辑考试的回调函数
 * @param onDelete - 删除考试的回调函数
 * @param isParticipated - 用户是否已参与考试
 * @param userStatus - 用户当前考试状态
 * @returns 考试卡片组件
 */
export default function ExamCard({
  exam,
  showActions = false,
  onEdit,
  onDelete,
  isParticipated = false,
  userStatus
}: ExamCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  /**
   * 获取考试状态的显示信息
   * @param status - 考试状态
   * @returns 状态显示信息，包含文本和样式类名
   */
  const getStatusInfo = (status: ExamStatus) => {
    const statusMap = {
      draft: { text: '草稿', className: 'bg-gray-100 text-gray-800' },
      published: { text: '已发布', className: 'bg-green-100 text-green-800' },
      ongoing: { text: '进行中', className: 'bg-blue-100 text-blue-800' },
      ended: { text: '已结束', className: 'bg-red-100 text-red-800' },
      cancelled: { text: '已取消', className: 'bg-yellow-100 text-yellow-800' }
    };
    return statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
  };

  /**
   * 获取用户状态的显示信息
   * @param status - 用户考试状态
   * @returns 用户状态显示信息
   */
  const getUserStatusInfo = (status: string) => {
    const statusMap = {
      not_started: { text: '未开始', className: 'bg-gray-100 text-gray-800' },
      in_progress: { text: '进行中', className: 'bg-blue-100 text-blue-800' },
      completed: { text: '已完成', className: 'bg-green-100 text-green-800' },
      paused: { text: '已暂停', className: 'bg-yellow-100 text-yellow-800' }
    };
    return statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
  };

  /**
   * 判断考试是否可以开始
   * @returns 是否可以开始考试
   */
  const canStartExam = () => {
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    return exam.status === 'published' && 
           now >= startTime && 
           now <= endTime && 
           (!isParticipated || userStatus === 'paused');
  };

  /**
   * 判断是否可以继续考试
   * @returns 是否可以继续考试
   */
  const canContinueExam = () => {
    return isParticipated && (userStatus === 'in_progress' || userStatus === 'paused');
  };

  /**
   * 处理查看详情按钮点击
   */
  const handleViewDetails = () => {
    router.push(`/exam/${exam.id}/details`);
  };

  /**
   * 处理参加考试按钮点击
   */
  const handleJoinExam = async () => {
    if (eligibilityChecking || loading) return;

    try {
      setEligibilityChecking(true);
      
      // 检查考试资格
      const eligibility = await ExamService.checkExamEligibility(exam.id);
      
      if (!eligibility.eligible) {
        toast.error(eligibility.reason || '您暂时无法参加此考试');
        return;
      }

      // 如果有进行中的考试，直接跳转
      if (canContinueExam()) {
        router.push(`/exam/${exam.id}`);
        return;
      }

      // 跳转到考试详情页面进行报名
      router.push(`/exam/${exam.id}/details`);
    } catch (error) {
      console.error('检查考试资格失败:', error);
      toast.error('检查考试资格失败，请稍后重试');
    } finally {
      setEligibilityChecking(false);
    }
  };

  /**
   * 处理编辑考试按钮点击
   */
  const handleEditExam = () => {
    if (onEdit) {
      onEdit(exam);
    } else {
      router.push(`/admin/exams/${exam.id}/edit`);
    }
  };

  /**
   * 处理删除考试确认
   */
  const handleDeleteConfirm = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await ExamService.deleteExam(exam.id);
      toast.success('考试删除成功');
      
      if (onDelete) {
        onDelete(exam.id);
      }
    } catch (error) {
      console.error('删除考试失败:', error);
      toast.error('删除考试失败，请稍后重试');
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  /**
   * 获取考试时间状态
   * @returns 考试时间状态信息
   */
  const getTimeStatus = () => {
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    if (now < startTime) {
      return { text: '未开始', className: 'text-gray-600' };
    } else if (now > endTime) {
      return { text: '已结束', className: 'text-red-600' };
    } else {
      return { text: '进行中', className: 'text-green-600' };
    }
  };

  const statusInfo = getStatusInfo(exam.status);
  const timeStatus = getTimeStatus();

  return (
    <>
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{exam.title}</CardTitle>
            <CardDescription className="text-sm text-gray-600 line-clamp-2">
              {exam.description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={statusInfo.className}>
              {statusInfo.text}
            </Badge>
            {userStatus && (
              <Badge className={getUserStatusInfo(userStatus).className}>
                {getUserStatusInfo(userStatus).text}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 考试基本信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(exam.duration)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{exam.total_questions || 0} 题</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{exam.participant_count || 0} 人参与</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4" />
            <span className={timeStatus.className}>{timeStatus.text}</span>
          </div>
        </div>
        
        {/* 考试时间信息 */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">开始时间：</span>
              <span className="font-medium">{formatDateTime(exam.start_time)}</span>
            </div>
            <div>
              <span className="text-gray-600">结束时间：</span>
              <span className="font-medium">{formatDateTime(exam.end_time)}</span>
            </div>
          </div>
        </div>
        
        {/* 考试设置信息 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {exam.settings?.shuffle_questions && (
            <Badge variant="outline" className="text-xs">
              题目乱序
            </Badge>
          )}
          {exam.settings?.shuffle_options && (
            <Badge variant="outline" className="text-xs">
              选项乱序
            </Badge>
          )}
          {exam.settings?.show_result_immediately && (
            <Badge variant="outline" className="text-xs">
              立即显示结果
            </Badge>
          )}
          {exam.settings?.allow_review && (
            <Badge variant="outline" className="text-xs">
              允许回顾
            </Badge>
          )}
          {exam.settings?.anti_cheat_enabled && (
            <Badge variant="outline" className="text-xs">
              防作弊监控
            </Badge>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {/* 学生视图 - 操作按钮 */}
            {!showActions && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleViewDetails}
                  disabled={loading || eligibilityChecking}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  查看详情
                </Button>
                
                {canStartExam() && (
                  <Button 
                    size="sm"
                    onClick={handleJoinExam}
                    disabled={loading || eligibilityChecking}
                  >
                    {eligibilityChecking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                        检查中
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        开始考试
                      </>
                    )}
                  </Button>
                )}
                
                {canContinueExam() && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={handleJoinExam}
                    disabled={loading || eligibilityChecking}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    继续考试
                  </Button>
                )}
                
                {userStatus === 'completed' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push(`/exam/${exam.id}/result`)}
                    disabled={loading}
                  >
                    查看结果
                  </Button>
                )}
              </div>
            )}
            
            {/* 管理员视图 - 管理按钮 */}
            {showActions && (
              <>
                <Link href={`/admin/exams/${exam.id}`}>
                  <Button variant="outline" size="sm">
                    查看详情
                  </Button>
                </Link>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditExam}
                  disabled={loading}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  删除
                </Button>
              </>
            )}
          </div>
          
          {/* 总分显示 */}
          {exam.total_points && (
            <div className="text-sm text-gray-600">
              总分：<span className="font-medium">{exam.total_points}</span> 分
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* 删除确认对话框 */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            确认删除考试
          </AlertDialogTitle>
          <AlertDialogDescription>
            您确定要删除考试「{exam.title}」吗？
            <br />
            <span className="text-destructive font-medium">
              此操作不可撤销，将永久删除考试及其相关数据。
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                删除中...
              </>
            ) : (
              '确认删除'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}