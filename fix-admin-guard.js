/**
 * AdminGuard组件问题修复脚本
 * 分析并修复管理员权限验证问题
 */

const fs = require('fs');
const path = require('path');

/**
 * 分析AdminGuard组件的问题
 */
function analyzeAdminGuardIssue() {
  console.log('🔍 分析AdminGuard组件问题...');
  console.log('=' .repeat(60));
  
  console.log('\n📋 诊断结果分析:');
  console.log('✅ 管理员登录成功');
  console.log('✅ Token正确存储在localStorage');
  console.log('✅ 权限检查API返回200状态码');
  console.log('✅ API响应包含正确的管理员信息');
  console.log('❌ 页面仍显示"权限不足"');
  
  console.log('\n🎯 问题定位:');
  console.log('问题出现在AdminGuard组件的前端权限检查逻辑中');
  console.log('虽然API返回成功，但组件状态更新可能存在问题');
  
  console.log('\n🔧 可能的原因:');
  console.log('1. AdminGuard组件的状态更新时机问题');
  console.log('2. useAuth hook与AdminGuard的状态同步问题');
  console.log('3. React组件重新渲染导致的状态丢失');
  console.log('4. 异步权限检查的竞态条件');
  
  return {
    apiWorking: true,
    tokenStored: true,
    loginSuccessful: true,
    frontendIssue: true
  };
}

/**
 * 创建修复后的AdminGuard组件
 */
function createFixedAdminGuard() {
  console.log('\n🛠️ 创建修复后的AdminGuard组件...');
  
  const fixedAdminGuardContent = `'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 管理员权限保护组件（修复版）
 * 用于保护需要管理员权限的页面和组件
 * @param children - 需要保护的子组件
 * @param fallback - 权限不足时显示的组件
 */
export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // 防止组件卸载后状态更新
    
    const checkAdminPermission = async () => {
      console.log('🔍 AdminGuard: 开始检查权限...');
      
      if (loading) {
        console.log('⏳ AdminGuard: 等待认证状态加载...');
        return;
      }
      
      if (!isLoggedIn || !user) {
        console.log('❌ AdminGuard: 用户未登录');
        if (isMounted) {
          setIsAdmin(false);
          setChecking(false);
          setError('用户未登录');
        }
        return;
      }

      try {
        const token = localStorage.getItem('token');
        console.log('🔑 AdminGuard: Token存在:', !!token);
        
        if (!token) {
          console.log('❌ AdminGuard: 未找到token');
          if (isMounted) {
            setIsAdmin(false);
            setChecking(false);
            setError('未找到认证token');
          }
          return;
        }

        console.log('🌐 AdminGuard: 调用权限检查API...');
        const response = await fetch('/api/admin/check-permission', {
          method: 'GET',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 AdminGuard: API响应状态:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📋 AdminGuard: API响应结果:', result);
          
          const hasPermission = result.success === true;
          console.log('✅ AdminGuard: 权限检查结果:', hasPermission);
          
          if (isMounted) {
            setIsAdmin(hasPermission);
            setError(hasPermission ? null : '权限验证失败');
          }
        } else {
          console.log('❌ AdminGuard: API响应失败:', response.status, response.statusText);
          const errorText = await response.text();
          console.log('❌ AdminGuard: 错误详情:', errorText);
          
          if (isMounted) {
            setIsAdmin(false);
            setError(\`权限检查失败: \${response.status}\`);
          }
        }
      } catch (error) {
        console.error('❌ AdminGuard: 检查管理员权限失败:', error);
        if (isMounted) {
          setIsAdmin(false);
          setError(\`网络错误: \${error.message}\`);
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    };

    checkAdminPermission();
    
    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, user, loading]);

  // 正在检查权限
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">正在验证权限...</p>
          {error && (
            <p className="text-red-500 text-sm mt-2">调试信息: {error}</p>
          )}
        </div>
      </div>
    );
  }

  // 未登录
  if (!isLoggedIn || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            需要登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            请先登录您的账户以访问此页面。
          </p>
          {error && (
            <p className="text-red-500 text-sm mb-4">错误: {error}</p>
          )}
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  // 权限不足
  if (isAdmin === false) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            权限不足
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            您没有访问管理后台的权限。如需帮助，请联系系统管理员。
          </p>
          {error && (
            <p className="text-red-500 text-sm mb-4">调试信息: {error}</p>
          )}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              返回首页
            </button>
            <button
              onClick={() => router.back()}
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              返回上一页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 有权限，渲染子组件
  console.log('✅ AdminGuard: 权限验证通过，渲染管理员页面');
  return <>{children}</>;
}

/**
 * 管理员权限检查Hook（修复版）
 * 用于在组件中检查当前用户是否具有管理员权限
 * @returns {object} 包含权限状态和检查函数的对象
 */
export function useAdminPermission() {
  const { user, isLoggedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkPermission = async () => {
    if (!isLoggedIn || !user) {
      setIsAdmin(false);
      return false;
    }

    setChecking(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAdmin(false);
        return false;
      }

      const response = await fetch('/api/admin/check-permission', {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const hasPermission = result.success === true;
        setIsAdmin(hasPermission);
        return hasPermission;
      } else {
        setIsAdmin(false);
        return false;
      }
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      setIsAdmin(false);
      return false;
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkPermission();
  }, [isLoggedIn, user]);

  return {
    isAdmin,
    checking,
    checkPermission,
    refresh: checkPermission
  };
}`;

  return fixedAdminGuardContent;
}

/**
 * 应用修复
 */
function applyFix() {
  console.log('\n🔧 应用AdminGuard修复...');
  
  const adminGuardPath = path.join(__dirname, 'src/components/auth/AdminGuard.tsx');
  const backupPath = path.join(__dirname, 'src/components/auth/AdminGuard.tsx.backup');
  
  try {
    // 备份原文件
    if (fs.existsSync(adminGuardPath)) {
      fs.copyFileSync(adminGuardPath, backupPath);
      console.log('✅ 原文件已备份为: AdminGuard.tsx.backup');
    }
    
    // 写入修复后的代码
    const fixedContent = createFixedAdminGuard();
    fs.writeFileSync(adminGuardPath, fixedContent, 'utf8');
    console.log('✅ AdminGuard组件已更新');
    
    return true;
  } catch (error) {
    console.error('❌ 应用修复失败:', error.message);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 AdminGuard问题修复工具');
  console.log('=' .repeat(60));
  
  // 分析问题
  const analysis = analyzeAdminGuardIssue();
  
  if (analysis.frontendIssue) {
    console.log('\n🎯 确认问题在前端AdminGuard组件');
    
    // 应用修复
    const success = applyFix();
    
    if (success) {
      console.log('\n✅ 修复完成！');
      console.log('\n📋 修复内容:');
      console.log('1. 添加了详细的调试日志');
      console.log('2. 修复了组件卸载后的状态更新问题');
      console.log('3. 增强了错误处理和显示');
      console.log('4. 改进了异步权限检查的逻辑');
      
      console.log('\n🔄 下一步操作:');
      console.log('1. 重新启动开发服务器');
      console.log('2. 清除浏览器缓存');
      console.log('3. 重新登录管理员账户');
      console.log('4. 访问管理员页面验证修复效果');
    } else {
      console.log('\n❌ 修复失败，请手动检查文件权限');
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 修复工具执行完成');
}

// 运行修复工具
if (require.main === module) {
  main();
}

module.exports = {
  analyzeAdminGuardIssue,
  createFixedAdminGuard,
  applyFix
};