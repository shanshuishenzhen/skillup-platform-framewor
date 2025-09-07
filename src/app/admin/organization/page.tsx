import React from 'react';
import dynamic from 'next/dynamic';

/**
 * 页面元数据
 */
export const metadata = {
  title: '组织架构管理 - 技能提升平台',
  description: '管理公司组织架构，查看部门层级关系，配置部门权限和人员分配'
};

// 动态导入客户端组件
const OrganizationManagement = dynamic(
  () => import('../../../pages/admin/OrganizationManagement'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载组织架构管理...</p>
        </div>
      </div>
    )
  }
);

/**
 * 组织架构管理页面
 * 提供完整的组织架构可视化和管理功能
 * 
 * @returns 组织架构管理页面组件
 */
const OrganizationPage: React.FC = () => {
  return <OrganizationManagement />;
};

export default OrganizationPage;