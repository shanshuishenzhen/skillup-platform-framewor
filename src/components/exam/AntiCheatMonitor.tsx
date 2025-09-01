'use client';

import { useEffect, useRef, useState } from 'react';
import { ExamService, AntiCheatMonitor as AntiCheatState } from '@/services/examService';
import { toast } from 'sonner';

interface AntiCheatMonitorProps {
  attemptId: string;
  examId: string;
  userId: string;
  onViolationDetected?: (violation: any) => void;
  isActive: boolean;
}

/**
 * 防作弊监控组件
 * 监控用户在考试过程中的各种行为，检测潜在的作弊行为
 * @param attemptId 考试尝试ID
 * @param examId 考试ID
 * @param userId 用户ID
 * @param onViolationDetected 违规检测回调
 * @param isActive 是否激活监控
 */
export default function AntiCheatMonitor({
  attemptId,
  examId,
  userId,
  onViolationDetected,
  isActive
}: AntiCheatMonitorProps) {
  const [monitorState, setMonitorState] = useState<AntiCheatState>({
    tabSwitchCount: 0,
    lastActiveTime: Date.now(),
    suspiciousActivities: [],
    isMonitoring: false,
    violations: []
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef(Date.now());
  const tabSwitchCountRef = useRef(0);

  /**
   * 记录违规行为
   * @param violationType 违规类型
   * @param description 描述
   * @param severity 严重程度
   * @param metadata 元数据
   */
  const recordViolation = async (
    violationType: string,
    description: string,
    severity: 'low' | 'medium' | 'high',
    metadata?: Record<string, any>
  ) => {
    try {
      const violation = await ExamService.recordViolation({
        exam_id: examId,
        user_id: userId,
        attempt_id: attemptId,
        violation_type: violationType as any,
        description,
        severity,
        metadata
      });

      setMonitorState(prev => ({
        ...prev,
        violations: [...prev.violations, violation]
      }));

      onViolationDetected?.(violation);

      // 根据严重程度显示不同的警告
      switch (severity) {
        case 'low':
          toast.warning(`检测到可疑行为: ${description}`);
          break;
        case 'medium':
          toast.error(`警告: ${description}`);
          break;
        case 'high':
          toast.error(`严重违规: ${description}`);
          break;
      }
    } catch (error) {
      console.error('记录违规失败:', error);
    }
  };

  /**
   * 处理页面可见性变化（标签页切换检测）
   */
  const handleVisibilityChange = () => {
    if (!isActive) return;

    if (document.hidden) {
      tabSwitchCountRef.current += 1;
      
      setMonitorState(prev => ({
        ...prev,
        tabSwitchCount: tabSwitchCountRef.current,
        suspiciousActivities: [...prev.suspiciousActivities, `标签页切换 ${new Date().toLocaleTimeString()}`]
      }));

      // 根据切换次数确定严重程度
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (tabSwitchCountRef.current >= 5) {
        severity = 'high';
      } else if (tabSwitchCountRef.current >= 3) {
        severity = 'medium';
      }

      recordViolation(
        'tab_switch',
        `检测到标签页切换，累计 ${tabSwitchCountRef.current} 次`,
        severity,
        { switchCount: tabSwitchCountRef.current }
      );
    } else {
      lastActiveRef.current = Date.now();
    }
  };

  /**
   * 处理右键点击（防止复制）
   */
  const handleContextMenu = (e: MouseEvent) => {
    if (!isActive) return;
    
    e.preventDefault();
    recordViolation(
      'right_click',
      '尝试使用右键菜单',
      'medium',
      { timestamp: Date.now() }
    );
  };

  /**
   * 处理复制粘贴操作
   */
  const handleCopyPaste = (e: KeyboardEvent) => {
    if (!isActive) return;

    const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c';
    const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v';
    const isCut = (e.ctrlKey || e.metaKey) && e.key === 'x';

    if (isCopy || isPaste || isCut) {
      e.preventDefault();
      recordViolation(
        'copy_paste',
        `尝试${isCopy ? '复制' : isPaste ? '粘贴' : '剪切'}内容`,
        'medium',
        { action: isCopy ? 'copy' : isPaste ? 'paste' : 'cut' }
      );
    }
  };

  /**
   * 检测长时间不活跃
   */
  const checkInactivity = () => {
    if (!isActive) return;

    const now = Date.now();
    const inactiveTime = now - lastActiveRef.current;
    const inactiveMinutes = inactiveTime / (1000 * 60);

    // 超过10分钟不活跃视为可疑
    if (inactiveMinutes > 10) {
      recordViolation(
        'suspicious_behavior',
        `长时间不活跃 ${Math.round(inactiveMinutes)} 分钟`,
        'medium',
        { inactiveMinutes: Math.round(inactiveMinutes) }
      );
      lastActiveRef.current = now; // 重置计时器
    }
  };

  /**
   * 处理鼠标和键盘活动
   */
  const handleActivity = () => {
    if (!isActive) return;
    lastActiveRef.current = Date.now();
  };

  /**
   * 检查时间限制
   */
  const checkTimeLimit = async () => {
    if (!isActive) return;
    
    try {
      const isOvertime = await ExamService.validateTimeLimit(attemptId);
      if (isOvertime) {
        // 时间超限会在 ExamService 中自动记录违规
        setMonitorState(prev => ({
          ...prev,
          isMonitoring: false
        }));
      }
    } catch (error) {
      console.error('检查时间限制失败:', error);
    }
  };

  // 初始化监控
  useEffect(() => {
    if (!isActive) {
      setMonitorState(prev => ({ ...prev, isMonitoring: false }));
      return;
    }

    setMonitorState(prev => ({ ...prev, isMonitoring: true }));

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleCopyPaste);
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keypress', handleActivity);
    document.addEventListener('click', handleActivity);

    // 设置定时检查
    intervalRef.current = setInterval(() => {
      checkInactivity();
      checkTimeLimit();
    }, 30000); // 每30秒检查一次

    return () => {
      // 清理事件监听器
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleCopyPaste);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keypress', handleActivity);
      document.removeEventListener('click', handleActivity);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, attemptId, examId, userId]);

  // 检查多次尝试
  useEffect(() => {
    if (!isActive) return;

    const checkMultipleAttempts = async () => {
      try {
        const hasMultiple = await ExamService.checkMultipleAttempts(examId, userId);
        if (hasMultiple) {
          recordViolation(
            'multiple_attempts',
            '检测到多个活跃的考试尝试',
            'high',
            { examId, userId }
          );
        }
      } catch (error) {
        console.error('检查多次尝试失败:', error);
      }
    };

    checkMultipleAttempts();
  }, [isActive, examId, userId]);

  // 监控状态显示（仅在开发环境显示）
  if (process.env.NODE_ENV === 'development' && monitorState.isMonitoring) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs z-50">
        <div>监控状态: {monitorState.isMonitoring ? '活跃' : '停止'}</div>
        <div>标签切换: {monitorState.tabSwitchCount} 次</div>
        <div>违规记录: {monitorState.violations.length} 条</div>
      </div>
    );
  }

  return null;
}