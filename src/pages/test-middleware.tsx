/**
 * 测试中间件功能的简单页面
 */
import React from 'react';
import { GetServerSideProps } from 'next';

interface TestMiddlewareProps {
  userInfo?: {
    id?: string;
    role?: string;
    userType?: string;
    email?: string;
  };
  timestamp: string;
}

export default function TestMiddleware({ userInfo, timestamp }: TestMiddlewareProps) {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">中间件测试页面</h1>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">页面加载时间</h2>
            <p className="text-blue-700">{timestamp}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-green-900 mb-2">用户信息</h2>
            {userInfo ? (
              <div className="text-green-700">
                <p><strong>用户ID:</strong> {userInfo.id || '未知'}</p>
                <p><strong>角色:</strong> {userInfo.role || '未知'}</p>
                <p><strong>用户类型:</strong> {userInfo.userType || '未知'}</p>
                <p><strong>邮箱:</strong> {userInfo.email || '未知'}</p>
              </div>
            ) : (
              <p className="text-green-700">未登录用户</p>
            )}
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">中间件状态</h2>
            <p className="text-yellow-700">
              如果您能看到这个页面，说明中间件允许访问此页面。
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex space-x-4">
          <a 
            href="/courses/3/learn" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            测试付费课程访问
          </a>
          <a 
            href="/courses/1/learn" 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            测试免费课程访问
          </a>
          <a 
            href="/login" 
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            登录页面
          </a>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  // 从中间件设置的请求头中获取用户信息
  const userInfo = {
    id: req.headers['x-user-id'] as string,
    role: req.headers['x-user-role'] as string,
    userType: req.headers['x-user-type'] as string,
    email: req.headers['x-user-email'] as string,
  };
  
  // 如果没有用户信息，返回null
  const hasUserInfo = userInfo.id || userInfo.role || userInfo.userType || userInfo.email;
  
  return {
    props: {
      userInfo: hasUserInfo ? userInfo : null,
      timestamp: new Date().toISOString(),
    },
  };
};