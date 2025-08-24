'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: '首页', href: '/' },
  { name: '关于我们', href: '/about' },
  { name: '产品服务', href: '/services', children: [
    { name: '在线学习', href: '/courses' },
    { name: '技能培训学习', href: '/skill-training' },
    { name: '技能等级考试', href: '/skill-exam' },
    { name: '技术咨询', href: '/consulting' },
    { name: '解决方案', href: '/solutions' },
  ]},
  { name: '案例展示', href: '/showcase' },
  { name: '联系我们', href: '/contact' },
];

export default function Header() {
  const [, setMobileMenuOpen] = useState(false);
  const { user, isLoggedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // 检查用户是否为管理员
  useEffect(() => {
    const checkAdminPermission = async () => {
      if (isLoggedIn && user) {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setIsAdmin(false);
            return;
          }
          
          const response = await fetch('/api/admin/check-permission', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            setIsAdmin(result.success === true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('检查管理员权限失败:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminPermission();
  }, [isLoggedIn, user]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold font-display gradient-text">
                SkillUp
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">在线学习平台</span>
            </div>
          </Link>
        </div>
        
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-gray-300"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">打开主菜单</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <div key={item.name} className="relative group">
              {item.children ? (
                <>
                  <button className="flex items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    {item.name}
                    <ChevronDown className="h-5 w-5 flex-none" aria-hidden="true" />
                  </button>
                  <div className="absolute -left-8 top-full z-10 mt-3 w-screen max-w-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="overflow-hidden rounded-3xl bg-white/95 dark:bg-gray-900/95 shadow-lg ring-1 ring-gray-900/5 backdrop-blur-sm">
                      <div className="p-4">
                        {item.children.map((child) => (
                          <div
                            key={child.name}
                            className="group relative flex items-center gap-x-6 rounded-lg p-4 text-sm leading-6 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <div className="flex-auto">
                              <Link href={child.href} className="block font-semibold text-gray-900 dark:text-gray-100">
                                {child.name}
                                <span className="absolute inset-0" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  href={item.href}
                  className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </div>
          ))}
          
          {/* 管理员入口 */}
          {isAdmin && (
            <div className="relative group">
              <Link
                href="/admin"
                className="flex items-center gap-x-1 text-sm font-semibold leading-6 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                title="管理后台"
              >
                <Settings className="h-4 w-4" />
                管理后台
              </Link>
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-6">
          {isLoggedIn ? (
            <>
              <span className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                欢迎，{user?.name || user?.email}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.reload();
                }}
                className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
