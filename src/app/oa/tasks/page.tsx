/**
 * 任务管理页面
 * 显示所有任务列表，支持搜索、筛选和创建新任务
 */

'use client';

import SimpleTaskManager from '@/components/tasks/SimpleTaskManager';


export default function TasksPage() {
  // 模拟当前用户数据
  const currentUser = {
    id: 'user-1',
    name: '当前用户',
    email: 'user@example.com'
  };

  return <SimpleTaskManager currentUser={currentUser} />;
}