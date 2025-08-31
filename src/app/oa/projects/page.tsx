/**
 * 项目管理页面
 * 显示所有项目列表，支持搜索、筛选和创建新项目
 */

'use client';

import SimpleProjectManager from '@/components/projects/SimpleProjectManager';


export default function ProjectsPage() {
  // 模拟当前用户数据
  const currentUser = {
    id: 'user-1',
    name: '当前用户',
    email: 'user@example.com'
  };

  return <SimpleProjectManager currentUser={currentUser} />;
}