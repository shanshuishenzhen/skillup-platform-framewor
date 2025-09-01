import React from 'react';
import { Loader2, AlertCircle, CheckCircle, Clock, FileText, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/**
 * 加载状态组件集合
 * 提供各种场景下的加载状态和反馈界面
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

/**
 * 基础加载旋转器
 */
export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

/**
 * 骨架屏组件
 */
export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-muted rounded ${className}`}
        />
      ))}
    </>
  );
}

/**
 * 考试卡片骨架屏
 */
export function ExamCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-6">
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 题目列表骨架屏
 */
export function QuestionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="space-y-2 ml-8">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface ProgressLoadingProps {
  progress: number;
  text?: string;
  subText?: string;
}

/**
 * 进度条加载
 */
export function ProgressLoading({ progress, text, subText }: ProgressLoadingProps) {
  return (
    <div className="space-y-4 p-6">
      <div className="text-center">
        {text && <h3 className="text-lg font-medium">{text}</h3>}
        {subText && <p className="text-sm text-muted-foreground">{subText}</p>}
      </div>
      <Progress value={progress} className="w-full" />
      <div className="text-center text-sm text-muted-foreground">
        {progress}% 完成
      </div>
    </div>
  );
}

interface StepLoadingProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
}

/**
 * 步骤加载
 */
export function StepLoading({ steps, currentStep, completedSteps = [] }: StepLoadingProps) {
  return (
    <div className="space-y-4 p-6">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div key={index} className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              isCompleted
                ? 'bg-green-500 text-white'
                : isCurrent
                ? 'bg-blue-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}>
              {isCompleted ? (
                <CheckCircle className="w-4 h-4" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>
            <span className={`text-sm ${
              isCompleted
                ? 'text-green-600'
                : isCurrent
                ? 'text-blue-600 font-medium'
                : 'text-muted-foreground'
            }`}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 空状态组件
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-muted-foreground">
        {icon || <FileText className="w-12 h-12" />}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * 考试相关空状态
 */
export function ExamEmptyState() {
  return (
    <EmptyState
      icon={<FileText className="w-12 h-12" />}
      title="暂无考试"
      description="还没有创建任何考试，点击下方按钮开始创建第一个考试。"
    />
  );
}

export function QuestionEmptyState() {
  return (
    <EmptyState
      icon={<FileText className="w-12 h-12" />}
      title="暂无题目"
      description="该考试还没有添加任何题目，请先添加题目后再发布考试。"
    />
  );
}

export function StudentEmptyState() {
  return (
    <EmptyState
      icon={<Users className="w-12 h-12" />}
      title="暂无学生"
      description="还没有学生参与此考试，请分享考试链接给学生。"
    />
  );
}

export function ResultEmptyState() {
  return (
    <EmptyState
      icon={<BarChart3 className="w-12 h-12" />}
      title="暂无结果"
      description="还没有学生完成考试，完成后将在这里显示结果统计。"
    />
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  showRetry?: boolean;
}

/**
 * 错误状态组件
 */
export function ErrorState({ 
  title = '出现错误', 
  message, 
  retry, 
  showRetry = true 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {message}
      </p>
      {showRetry && retry && (
        <Button onClick={retry} variant="outline">
          重试
        </Button>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children: React.ReactNode;
}

/**
 * 加载遮罩层
 */
export function LoadingOverlay({ isLoading, text, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <LoadingSpinner size="lg" text={text} />
        </div>
      )}
    </div>
  );
}

interface TimeoutStateProps {
  onRetry: () => void;
  timeout?: number;
}

/**
 * 超时状态组件
 */
export function TimeoutState({ onRetry, timeout = 30 }: TimeoutStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Clock className="w-12 h-12 text-orange-500 mb-4" />
      <h3 className="text-lg font-medium mb-2">请求超时</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        请求超过 {timeout} 秒未响应，请检查网络连接后重试。
      </p>
      <Button onClick={onRetry} variant="outline">
        重新加载
      </Button>
    </div>
  );
}

/**
 * 网络错误状态
 */
export function NetworkErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="网络连接失败"
      message="无法连接到服务器，请检查网络连接后重试。"
      retry={onRetry}
    />
  );
}

/**
 * 权限错误状态
 */
export function PermissionErrorState() {
  return (
    <ErrorState
      title="权限不足"
      message="您没有权限访问此内容，请联系管理员获取相应权限。"
      showRetry={false}
    />
  );
}

/**
 * 404错误状态
 */
export function NotFoundState({ resourceName = '页面' }: { resourceName?: string }) {
  return (
    <ErrorState
      title="未找到内容"
      message={`请求的${resourceName}不存在或已被删除。`}
      showRetry={false}
    />
  );
}