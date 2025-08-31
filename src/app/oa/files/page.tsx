/**
 * 文件管理页面
 * 显示所有文件列表，支持搜索、筛选和上传
 */

'use client';

import SimpleFileManager from '@/components/files/SimpleFileManager';

export default function FilesPage() {
  // 模拟当前用户数据
  const currentUser = {
    id: 'user-1',
    name: '当前用户',
    email: 'user@example.com'
  };

  return <SimpleFileManager currentUser={currentUser} />;
}