/**
 * OA系统 - 项目管理页面
 * 完整的项目管理功能，包含项目创建、任务分配、进度跟踪等
 */

'use client';

import React from 'react';
import ProjectManagement from '@/components/projects/ProjectManagement';

export default function ProjectsPage() {
  // 模拟当前用户信息
  const currentUser = {
    id: 'current-user',
    name: '当前用户',
    email: 'current@example.com'
  };

  return (
    <ProjectManagement currentUser={currentUser} />
  );
}