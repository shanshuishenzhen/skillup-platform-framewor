import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const Header = () => {
  return (
    <header className="bg-white shadow-DEFAULT">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary">
          SkillUp
        </Link>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/courses" className="text-gray-600 hover:text-primary transition-colors">课程</Link>
          <Link href="#pricing" className="text-gray-600 hover:text-primary transition-colors">定价</Link>
          <Link href="#about" className="text-gray-600 hover:text-primary transition-colors">关于我们</Link>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/login">
            <Button variant="ghost">登录</Button>
          </Link>
          <Link href="/register">
            <Button>注册</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
