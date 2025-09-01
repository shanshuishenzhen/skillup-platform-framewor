import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">联系我们</h3>
            <p className="text-gray-300 text-sm mb-2">地址：深圳市南山区科技园南区</p>
            <p className="text-gray-300 text-sm mb-2">电话：400-888-9999</p>
            <p className="text-gray-300 text-sm mb-2">邮箱：info@skillup-platform.com</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-300 hover:text-white transition-colors">关于我们</Link></li>
              <li><Link href="/services" className="text-gray-300 hover:text-white transition-colors">产品服务</Link></li>
              <li><Link href="/skill-training" className="text-gray-300 hover:text-white transition-colors">技能培训</Link></li>
              <li><Link href="/contact" className="text-gray-300 hover:text-white transition-colors">联系我们</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">关注我们</h3>
            <p className="text-gray-300 text-sm mb-4">扫码关注官方公众号</p>
            <div className="w-20 h-20 bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} 深圳市融略信息科技有限公司. 保留所有权利.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
