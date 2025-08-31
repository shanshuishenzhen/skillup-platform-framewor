/**
 * Next.js 生产环境配置文件
 * 针对生产环境进行优化的配置
 * 
 * @author SkillUp Platform Team
 * @version 1.0.0
 */

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产环境优化
  reactStrictMode: true,
  swcMinify: true,
  
  // 性能优化
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // 图片优化
  images: {
    domains: [
      'localhost',
      'skillup-platform.vercel.app',
      'your-domain.com',
      'supabase.co',
      'githubusercontent.com'
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // 实验性功能
  experimental: {
    // 启用应用目录
    appDir: true,
    // 服务器组件
    serverComponentsExternalPackages: ['bcryptjs', 'jsonwebtoken'],
    // 优化包导入
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts'
    ],
  },
  
  // 编译优化
  compiler: {
    // 移除 console.log（仅在生产环境）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // 输出配置
  output: 'standalone',
  
  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 公共运行时配置
  publicRuntimeConfig: {
    // 这些变量将在客户端和服务器端都可用
    APP_NAME: 'SkillUp Platform',
    APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // 服务器运行时配置
  serverRuntimeConfig: {
    // 这些变量只在服务器端可用
    PROJECT_ROOT: __dirname,
  },
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ];
  },
  
  // 重写配置
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // 头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS || 'https://your-domain.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 生产环境优化
    if (!dev) {
      // 代码分割优化
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
      
      // 压缩优化
      config.optimization.minimize = true;
    }
    
    // 别名配置
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // 忽略某些模块的警告
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
    ];
    
    return config;
  },
  
  // TypeScript 配置
  typescript: {
    // 在生产构建时忽略 TypeScript 错误（不推荐，但可以用于紧急部署）
    ignoreBuildErrors: false,
  },
  
  // ESLint 配置
  eslint: {
    // 在生产构建时忽略 ESLint 错误（不推荐）
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },
  
  // 静态文件优化
  assetPrefix: process.env.CDN_URL || '',
  
  // 跟踪配置
  analyticsId: process.env.ANALYTICS_ID || '',
  
  // 国际化配置（如果需要）
  i18n: {
    locales: ['zh-CN', 'en-US'],
    defaultLocale: 'zh-CN',
    localeDetection: false,
  },
  
  // 页面扩展名
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // 构建时的环境变量检查
  onDemandEntries: {
    // 页面在内存中保留的时间（毫秒）
    maxInactiveAge: 25 * 1000,
    // 同时保留的页面数
    pagesBufferLength: 2,
  },
  
  // 自定义构建目录
  distDir: '.next',
  
  // 清理构建输出
  cleanDistDir: true,
};

// 导出配置
module.exports = nextConfig;

// 如果需要条件性配置
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
}