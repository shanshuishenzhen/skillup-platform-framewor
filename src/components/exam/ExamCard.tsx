'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, FileText, Calendar, Play, Edit, Trash2 } from 'lucide-react';
import { Exam, ExamStatus } from '@/types/exam';
import { formatDuration, formatDateTime } from '@/utils/format';
import Link from 'next/link';

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
            {/* 学生视图 - 参与考试按钮 */}
            {!showActions && (
              <>
                {canStartExam() && (
                  <Link href={`/exam/${exam.id}/take`}>
                    <Button size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      {isParticipated ? '重新开始' : '开始考试'}
                    </Button>
                  </Link>
                )}
                
                {canContinueExam() && (
                  <Link href={`/exam/${exam.id}/take`}>
                    <Button size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      继续考试
                    </Button>
                  </Link>
                )}
                
                {userStatus === 'completed' && (
                  <Link href={`/exam/${exam.id}/result`}>
                    <Button variant="outline" size="sm">
                      查看结果
                    </Button>
                  </Link>
                )}
                
                {!canStartExam() && !canContinueExam() && userStatus !== 'completed' && (
                  <Button size="sm" disabled>
                    {exam.status === 'draft' ? '未发布' : 
                     new Date() < new Date(exam.start_time) ? '未开始' : '已结束'}
                  </Button>
                )}
              </>
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
                  onClick={() => onEdit?.(exam)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete?.(exam.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
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
  );
}