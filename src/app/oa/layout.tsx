/**
 * OA 系统布局组件
 * 提供 OA 系统的统一布局和导航
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  FolderOpen,
  CheckSquare,
  FileText,
  MessageSquare,
  Users,
  Settings,
  Menu,
  Bell,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * 导航菜单项接口
 */
interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

/**
 * 主导航菜单配置
 */
const mainNavItems: NavItem[] = [
  {
    title: '首页',
    href: '/oa',
    icon: Home
  },
  {
    title: '项目管理',
    href: '/oa/projects',
    icon: FolderOpen
  },
  {
    title: '任务管理',
    href: '/oa/tasks',
    icon: CheckSquare
  },
  {
    title: '文件管理',
    href: '/oa/files',
    icon: FileText
  },
  {
    title: '消息通讯',
    href: '/oa/messages',
    icon: MessageSquare,
    badge: 3
  },
  {
    title: '团队管理',
    href: '/oa/team',
    icon: Users
  }
];

/**
 * 导航项组件
 * @param item - 导航项配置
 * @param pathname - 当前路径
 * @param onClick - 点击事件处理函数
 * @returns JSX.Element
 */
function NavItem({ item, pathname, onClick }: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = pathname === item.href || (item.href !== '/oa' && pathname.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{item.title}</span>
      {item.badge && (
        <Badge variant="secondary" className="ml-auto">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

/**
 * 侧边栏组件
 * @param pathname - 当前路径
 * @param onItemClick - 导航项点击事件处理函数
 * @returns JSX.Element
 */
function Sidebar({ pathname, onItemClick }: {
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo 区域 */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/oa" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="h-4 w-4" />
          </div>
          <span>OA 系统</span>
        </Link>
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-4">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              pathname={pathname}
              onClick={onItemClick}
            />
          ))}
        </nav>
      </div>

      {/* 底部设置 */}
      <div className="border-t p-4">
        <Link
          href="/oa/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/oa/settings')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={onItemClick}
        >
          <Settings className="h-4 w-4" />
          <span>设置</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * 顶部导航栏组件
 * @param onMenuClick - 菜单按钮点击事件处理函数
 * @returns JSX.Element
 */
function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* 移动端菜单按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">切换菜单</span>
      </Button>

      {/* 搜索框 */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索项目、任务、文件..."
            className="pl-8"
          />
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-2">
        {/* 通知按钮 */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
            3
          </Badge>
          <span className="sr-only">通知</span>
        </Button>

        {/* 用户菜单 */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            U
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * OA 系统布局组件
 * @param children - 子组件
 * @returns JSX.Element
 */
export default function OALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* 桌面端侧边栏 */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <Sidebar pathname={pathname} />
      </div>

      {/* 移动端侧边栏 */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden sr-only">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar
            pathname={pathname}
            onItemClick={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <TopNav onMenuClick={() => setSidebarOpen(true)} />

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}