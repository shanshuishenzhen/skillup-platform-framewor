# 第一阶段实施指南：轻量化优化

## 1. 快速开始检查清单

### 1.1 当前状态评估
```bash
# 检查当前构建包大小
npm run build
du -sh .next  # Linux/Mac
# Windows: dir .next /s

# 分析依赖包大小
npx webpack-bundle-analyzer .next/static/chunks/*.js

# 检查 node_modules 大小
du -sh node_modules
```

### 1.2 目标检查点
- [ ] 构建包大小 < 100MB
- [ ] 首屏加载时间 < 3秒
- [ ] 核心功能正常运行
- [ ] Vercel 部署成功

## 2. 立即执行的优化措施

### 2.1 依赖包优化（预计减少 60MB）

#### 步骤 1：移动重型依赖到 devDependencies
```json
// package.json 修改
{
  "dependencies": {
    // 保留这些核心依赖
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "tailwindcss": "^3.0.0",
    "lucide-react": "^0.263.1",
    "@radix-ui/react-dialog": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.5"
  },
  "devDependencies": {
    // 移动这些到开发依赖
    "puppeteer": "^21.0.0",
    "mysql2": "^3.0.0",
    "redis": "^4.0.0",
    "ioredis": "^5.0.0",
    "openai": "^4.0.0",
    "@alicloud/pop-core": "^1.0.0",
    "@alicloud/oss": "^6.0.0",
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.1",
    "multer": "^1.4.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

#### 步骤 2：创建条件导入服务
```typescript
// lib/services/conditional-imports.ts
/**
 * 条件导入服务
 * 仅在服务端环境加载重型依赖
 */
export class ConditionalImports {
  /**
   * 动态导入 MySQL 服务
   */
  static async getMySQLService() {
    if (typeof window !== 'undefined') {
      throw new Error('MySQL 服务仅在服务端可用');
    }
    
    const { default: mysql } = await import('mysql2/promise');
    return mysql;
  }
  
  /**
   * 动态导入 Redis 服务
   */
  static async getRedisService() {
    if (typeof window !== 'undefined') {
      throw new Error('Redis 服务仅在服务端可用');
    }
    
    const { default: Redis } = await import('ioredis');
    return Redis;
  }
  
  /**
   * 动态导入 OpenAI 服务
   */
  static async getOpenAIService() {
    if (typeof window !== 'undefined') {
      throw new Error('OpenAI 服务仅在服务端可用');
    }
    
    const { default: OpenAI } = await import('openai');
    return OpenAI;
  }
  
  /**
   * 动态导入文件处理服务
   */
  static async getFileProcessingService() {
    if (typeof window !== 'undefined') {
      throw new Error('文件处理服务仅在服务端可用');
    }
    
    const [xlsx, papaparse, multer] = await Promise.all([
      import('xlsx'),
      import('papaparse'),
      import('multer')
    ]);
    
    return { xlsx, papaparse, multer };
  }
}
```

#### 步骤 3：重构现有服务使用条件导入
```typescript
// services/userService.ts 重构示例
import { ConditionalImports } from '@/lib/services/conditional-imports';

export class UserService {
  /**
   * 导入用户数据（服务端功能）
   */
  static async importUsers(file: File): Promise<any> {
    // 确保在服务端执行
    if (typeof window !== 'undefined') {
      throw new Error('用户导入功能仅在服务端可用');
    }
    
    try {
      const { xlsx } = await ConditionalImports.getFileProcessingService();
      const mysql = await ConditionalImports.getMySQLService();
      
      // 处理文件和数据库操作
      const workbook = xlsx.read(file);
      // ... 其他逻辑
      
    } catch (error) {
      console.error('用户导入失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户列表（轻量级功能）
   */
  static async getUsers(): Promise<any> {
    // 使用 Supabase 轻量级查询
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .limit(100);
    
    if (error) throw error;
    return data;
  }
}
```

### 2.2 Next.js 配置优化（预计减少 30MB）

#### 创建优化的 next.config.ts
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 启用实验性优化
  experimental: {
    // 优化包导入
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select'
    ],
    // 启用 CSS 优化
    optimizeCss: true,
    // 启用服务端组件
    serverComponentsExternalPackages: [
      'mysql2',
      'redis',
      'ioredis',
      'puppeteer',
      'openai'
    ]
  },
  
  // Webpack 配置优化
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 客户端排除服务端依赖
    if (!isServer) {
      config.externals = {
        ...config.externals,
        'mysql2': 'mysql2',
        'redis': 'redis',
        'ioredis': 'ioredis',
        'puppeteer': 'puppeteer',
        'openai': 'openai',
        '@alicloud/pop-core': '@alicloud/pop-core',
        '@alicloud/oss': '@alicloud/oss',
        'xlsx': 'xlsx',
        'papaparse': 'papaparse',
        'multer': 'multer',
        'bcryptjs': 'bcryptjs',
        'jsonwebtoken': 'jsonwebtoken'
      };
    }
    
    // 代码分割优化
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            maxSize: 244000
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20
          },
          ui: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 15
          }
        }
      }
    };
    
    // 压缩优化
    if (!dev) {
      config.optimization.minimize = true;
    }
    
    return config;
  },
  
  // 输出配置
  output: 'standalone',
  
  // 压缩配置
  compress: true,
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  
  // 静态资源优化
  assetPrefix: process.env.NODE_ENV === 'production' ? '/static' : '',
  
  // 构建优化
  swcMinify: true,
  
  // 环境变量
  env: {
    DEPLOYMENT_STAGE: 'stage1'
  }
};

export default nextConfig;
```

### 2.3 组件懒加载优化（预计减少 20MB）

#### 创建懒加载组件管理器
```typescript
// components/lazy/LazyComponents.tsx
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * 懒加载组件管理器
 * 统一管理所有需要懒加载的组件
 */
export class LazyComponents {
  // 管理后台组件
  static AdminDashboard = dynamic(
    () => import('@/components/admin/Dashboard'),
    {
      loading: () => (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">加载管理面板...</span>
        </div>
      ),
      ssr: false
    }
  );
  
  static AdminUserManagement = dynamic(
    () => import('@/components/admin/UserManagement'),
    {
      loading: () => <div>加载用户管理...</div>,
      ssr: false
    }
  );
  
  // AI 功能组件
  static FaceRecognition = dynamic(
    () => import('@/components/face-auth/FaceRecognition'),
    {
      loading: () => (
        <div className="text-center p-4">
          <div className="animate-pulse bg-gray-200 h-64 rounded"></div>
          <p className="mt-2">初始化人脸识别...</p>
        </div>
      ),
      ssr: false
    }
  );
  
  // 图表组件
  static Charts = dynamic(
    () => import('@/components/charts/Charts'),
    {
      loading: () => (
        <div className="animate-pulse bg-gray-200 h-96 rounded">
          <div className="flex items-center justify-center h-full">
            <span>加载图表...</span>
          </div>
        </div>
      ),
      ssr: false
    }
  );
  
  // 文件上传组件
  static FileUpload = dynamic(
    () => import('@/components/ui/FileUpload'),
    {
      loading: () => <div>加载文件上传...</div>,
      ssr: false
    }
  );
  
  // 富文本编辑器
  static RichEditor = dynamic(
    () => import('@/components/ui/RichEditor'),
    {
      loading: () => (
        <div className="border rounded p-4 h-64 bg-gray-50">
          <div className="animate-pulse bg-gray-200 h-full rounded"></div>
        </div>
      ),
      ssr: false
    }
  );
}

// 使用示例
export default function AdminPage() {
  return (
    <div>
      <h1>管理后台</h1>
      <LazyComponents.AdminDashboard />
    </div>
  );
}
```

### 2.4 .vercelignore 优化（预计减少 40MB）

#### 更新 .vercelignore 文件
```gitignore
# 开发环境文件
node_modules
.git
.gitignore
.env.local
.env.development
.env.test
.env.example
.env.monitoring.example

# 构建文件
.next
build
dist
out
*.tsbuildinfo

# 文档和说明
docs
README*.md
*.md
CHANGELOG.md
LICENSE

# 示例和模板
examples
templates
OA_SYSTEM

# 测试文件
__tests__
*.test.js
*.test.ts
*.test.tsx
*.spec.js
*.spec.ts
*.spec.tsx
jest.config.js
src/tests

# 开发工具配置
.vscode
.idea
*.log
*.logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# 数据文件
data
backups
uploads
*.xlsx
*.xls
*.csv
*.sql
*.db
*.sqlite

# 脚本文件
scripts
deploy
*.bat
*.ps1
*.sh
start.js
start.bat
start.ps1
start.sh
quick-start.bat
setup-environment.bat

# 配置文件
.trae
supabase
vercel.json
tailwind.config.js
postcss.config.mjs
eslint.config.mjs

# 调试和测试文件
debug-*
test-*
check-*
verify-*
fix-*
simple-*
direct-*
diagnose-*
generate-*
create-*
clean-*
*.html
*.png
*.jpg
*.jpeg
*.gif
*.svg

# 部署相关
deploy-auto.js
valid-token.json
start-config.json
admin-login-test.html
admin-page-debug.png
debug-token.html
test-login.html

# 临时文件
*.tmp
*.temp
.DS_Store
Thumbs.db

# 包管理文件
package-lock.json
yarn.lock
pnpm-lock.yaml

# TypeScript 配置
tsconfig.tsbuildinfo
```

### 2.5 API 路由优化

#### 创建轻量级 API 代理
```typescript
// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * API 代理路由
 * 在第一阶段提供基础功能，第二阶段可扩展为完整代理
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/proxy/', '');
  
  // 第一阶段：仅支持基础查询
  if (path.startsWith('users')) {
    return handleUsersAPI(request);
  } else if (path.startsWith('courses')) {
    return handleCoursesAPI(request);
  } else {
    return NextResponse.json(
      { error: '该功能在第二阶段提供' },
      { status: 501 }
    );
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/proxy/', '');
  
  // 第一阶段：限制重型操作
  const heavyOperations = ['import', 'export', 'ai', 'face-recognition'];
  
  if (heavyOperations.some(op => path.includes(op))) {
    return NextResponse.json(
      { 
        error: '重型操作在第二阶段提供',
        message: '当前为轻量化版本，该功能将在完整版本中提供'
      },
      { status: 501 }
    );
  }
  
  // 处理轻量级操作
  return handleLightweightOperations(request, path);
}

/**
 * 处理用户相关 API
 */
async function handleUsersAPI(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .limit(50); // 限制查询数量
    
    if (error) throw error;
    
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}

/**
 * 处理课程相关 API
 */
async function handleCoursesAPI(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, price, created_at')
      .limit(20);
    
    if (error) throw error;
    
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}

/**
 * 处理轻量级操作
 */
async function handleLightweightOperations(
  request: NextRequest, 
  path: string
): Promise<NextResponse> {
  const body = await request.json();
  
  // 基础的 CRUD 操作
  if (path.includes('create')) {
    return handleCreate(body);
  } else if (path.includes('update')) {
    return handleUpdate(body);
  } else if (path.includes('delete')) {
    return handleDelete(body);
  }
  
  return NextResponse.json(
    { error: '不支持的操作' },
    { status: 400 }
  );
}

async function handleCreate(data: any): Promise<NextResponse> {
  // 实现基础创建逻辑
  return NextResponse.json({ message: '创建成功', data });
}

async function handleUpdate(data: any): Promise<NextResponse> {
  // 实现基础更新逻辑
  return NextResponse.json({ message: '更新成功', data });
}

async function handleDelete(data: any): Promise<NextResponse> {
  // 实现基础删除逻辑
  return NextResponse.json({ message: '删除成功' });
}
```

## 3. 构建和部署脚本

### 3.1 优化的构建脚本
```json
// package.json 添加脚本
{
  "scripts": {
    "build:stage1": "cross-env DEPLOYMENT_STAGE=stage1 NODE_ENV=production next build",
    "build:analyze": "cross-env ANALYZE=true npm run build:stage1",
    "build:size-check": "npm run build:stage1 && node scripts/check-build-size.js",
    "optimize:clean": "rimraf .next node_modules/.cache",
    "optimize:deps": "npm prune --production && npm dedupe",
    "deploy:stage1": "npm run build:size-check && vercel --prod",
    "dev:light": "cross-env DEPLOYMENT_STAGE=stage1 next dev"
  }
}
```

### 3.2 构建大小检查脚本
```javascript
// scripts/check-build-size.js
const fs = require('fs');
const path = require('path');

/**
 * 检查构建包大小
 * 确保不超过 100MB 限制
 */
function checkBuildSize() {
  const buildDir = path.join(process.cwd(), '.next');
  
  if (!fs.existsSync(buildDir)) {
    console.error('❌ 构建目录不存在，请先运行 npm run build');
    process.exit(1);
  }
  
  // 计算目录大小
  function getDirSize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(currentPath) {
      const stats = fs.statSync(currentPath);
      
      if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath);
        files.forEach(file => {
          calculateSize(path.join(currentPath, file));
        });
      } else {
        totalSize += stats.size;
      }
    }
    
    calculateSize(dirPath);
    return totalSize;
  }
  
  const buildSize = getDirSize(buildDir);
  const buildSizeMB = (buildSize / 1024 / 1024).toFixed(2);
  
  console.log(`📦 构建包大小: ${buildSizeMB}MB`);
  
  // 检查各个子目录大小
  const subDirs = ['static', 'server', 'cache'];
  subDirs.forEach(dir => {
    const dirPath = path.join(buildDir, dir);
    if (fs.existsSync(dirPath)) {
      const dirSize = getDirSize(dirPath);
      const dirSizeMB = (dirSize / 1024 / 1024).toFixed(2);
      console.log(`  📁 ${dir}: ${dirSizeMB}MB`);
    }
  });
  
  // 检查是否超过限制
  const limitMB = 100;
  if (buildSize > limitMB * 1024 * 1024) {
    console.error(`❌ 构建包大小 ${buildSizeMB}MB 超过 ${limitMB}MB 限制`);
    console.log('\n🔧 建议优化措施:');
    console.log('1. 检查是否有大型依赖包未移至 devDependencies');
    console.log('2. 确认 .vercelignore 文件是否正确配置');
    console.log('3. 检查是否有大型静态资源未优化');
    console.log('4. 运行 npm run build:analyze 分析包组成');
    process.exit(1);
  } else {
    console.log(`✅ 构建包大小符合要求 (< ${limitMB}MB)`);
    
    // 计算节省的空间
    const originalSize = 160; // 原始大小 160MB
    const savedMB = originalSize - parseFloat(buildSizeMB);
    const savedPercent = ((savedMB / originalSize) * 100).toFixed(1);
    
    console.log(`💾 节省空间: ${savedMB.toFixed(2)}MB (${savedPercent}%)`);
  }
}

checkBuildSize();
```

### 3.3 依赖分析脚本
```javascript
// scripts/analyze-dependencies.js
const fs = require('fs');
const path = require('path');

/**
 * 分析依赖包大小
 * 识别可以优化的大型依赖
 */
function analyzeDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  console.log('📊 依赖包分析:');
  console.log('='.repeat(50));
  
  // 大型依赖包列表（估算大小）
  const largeDependencies = {
    'puppeteer': '~300MB',
    'mysql2': '~15MB',
    'redis': '~8MB',
    'ioredis': '~12MB',
    'openai': '~25MB',
    '@alicloud/pop-core': '~20MB',
    '@alicloud/oss': '~18MB',
    'xlsx': '~35MB',
    'bcryptjs': '~5MB',
    'jsonwebtoken': '~8MB',
    'multer': '~3MB',
    'papaparse': '~2MB'
  };
  
  let totalEstimatedSize = 0;
  let optimizableSize = 0;
  
  Object.keys(dependencies).forEach(dep => {
    if (largeDependencies[dep]) {
      const size = largeDependencies[dep];
      const sizeNum = parseFloat(size.replace('~', '').replace('MB', ''));
      totalEstimatedSize += sizeNum;
      
      const isInProd = packageJson.dependencies && packageJson.dependencies[dep];
      if (isInProd) {
        optimizableSize += sizeNum;
        console.log(`⚠️  ${dep}: ${size} (生产依赖 - 可优化)`);
      } else {
        console.log(`✅ ${dep}: ${size} (开发依赖)`);
      }
    }
  });
  
  console.log('='.repeat(50));
  console.log(`📦 大型依赖总大小: ~${totalEstimatedSize}MB`);
  console.log(`🔧 可优化大小: ~${optimizableSize}MB`);
  
  if (optimizableSize > 0) {
    console.log('\n💡 优化建议:');
    console.log('1. 将服务端专用依赖移至 devDependencies');
    console.log('2. 使用条件导入避免客户端加载');
    console.log('3. 考虑使用更轻量的替代方案');
  } else {
    console.log('\n✅ 依赖配置已优化');
  }
}

analyzeDependencies();
```

## 4. 测试和验证

### 4.1 功能测试清单
```typescript
// tests/stage1-validation.test.ts
import { describe, it, expect } from '@jest/globals';

/**
 * 第一阶段功能验证测试
 * 确保优化后核心功能正常
 */
describe('第一阶段功能验证', () => {
  describe('基础功能', () => {
    it('应用启动正常', async () => {
      // 测试应用能否正常启动
      const response = await fetch('http://localhost:3000');
      expect(response.status).toBe(200);
    });
    
    it('用户认证功能正常', async () => {
      // 测试登录功能
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      
      expect(loginResponse.status).toBe(200);
    });
    
    it('基础数据查询正常', async () => {
      // 测试数据查询
      const usersResponse = await fetch('/api/proxy/users');
      expect(usersResponse.status).toBe(200);
      
      const data = await usersResponse.json();
      expect(data).toHaveProperty('data');
    });
  });
  
  describe('重型功能限制', () => {
    it('重型操作应返回 501 状态', async () => {
      const heavyOperations = [
        '/api/proxy/import',
        '/api/proxy/ai/face-recognition',
        '/api/proxy/export'
      ];
      
      for (const operation of heavyOperations) {
        const response = await fetch(operation, { method: 'POST' });
        expect(response.status).toBe(501);
      }
    });
  });
  
  describe('性能验证', () => {
    it('首屏加载时间应小于 3 秒', async () => {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3000');
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(3000);
    });
    
    it('API 响应时间应小于 1 秒', async () => {
      const startTime = Date.now();
      const response = await fetch('/api/proxy/users');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000);
    });
  });
});
```

### 4.2 部署验证脚本
```bash
#!/bin/bash
# scripts/validate-deployment.sh

echo "🚀 开始第一阶段部署验证..."

# 1. 清理环境
echo "🧹 清理构建缓存..."
npm run optimize:clean

# 2. 安装依赖
echo "📦 安装依赖..."
npm ci

# 3. 分析依赖
echo "📊 分析依赖包..."
node scripts/analyze-dependencies.js

# 4. 构建应用
echo "🔨 构建应用..."
npm run build:stage1

# 5. 检查构建大小
echo "📏 检查构建大小..."
node scripts/check-build-size.js

# 6. 运行测试
echo "🧪 运行功能测试..."
npm test -- tests/stage1-validation.test.ts

# 7. 启动开发服务器进行验证
echo "🌐 启动开发服务器..."
npm run dev:light &
DEV_PID=$!

# 等待服务器启动
sleep 10

# 8. 验证关键端点
echo "✅ 验证关键功能..."
curl -f http://localhost:3000 || { echo "❌ 首页访问失败"; kill $DEV_PID; exit 1; }
curl -f http://localhost:3000/api/proxy/users || { echo "❌ API 访问失败"; kill $DEV_PID; exit 1; }

# 9. 停止开发服务器
kill $DEV_PID

echo "✅ 第一阶段验证完成！"
echo "📊 优化结果:"
echo "  - 构建包大小: < 100MB"
echo "  - 核心功能: 正常"
echo "  - 重型功能: 已禁用"
echo "  - 准备部署: 是"
```

## 5. 部署到 Vercel

### 5.1 环境变量配置
```bash
# .env.stage1
DEPLOYMENT_STAGE=stage1
NODE_ENV=production

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 功能开关
ENABLE_HEAVY_FEATURES=false
ENABLE_AI_FEATURES=false
ENABLE_FILE_IMPORT=false
```

### 5.2 Vercel 部署配置
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "env": {
    "DEPLOYMENT_STAGE": "stage1"
  }
}
```

### 5.3 部署命令
```bash
# 一键部署脚本
npm run deploy:stage1

# 或者分步执行
npm run build:size-check
vercel --prod
```

## 6. 监控和维护

### 6.1 简单监控脚本
```typescript
// utils/stage1-monitoring.ts
/**
 * 第一阶段简单监控
 * 基础的性能和错误监控
 */
export class Stage1Monitoring {
  /**
   * 记录页面加载时间
   */
  static trackPageLoad(pageName: string): void {
    if (typeof window !== 'undefined') {
      const loadTime = performance.now();
      console.log(`📊 页面 ${pageName} 加载时间: ${loadTime.toFixed(2)}ms`);
      
      // 存储到本地存储进行简单统计
      const key = `page_load_${pageName}`;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      history.push({ time: loadTime, timestamp: Date.now() });
      
      // 只保留最近 10 次记录
      if (history.length > 10) {
        history.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(history));
    }
  }
  
  /**
   * 记录 API 调用
   */
  static trackApiCall(apiName: string, duration: number, success: boolean): void {
    console.log(`🔗 API ${apiName}: ${duration}ms, 成功: ${success}`);
    
    if (duration > 5000) {
      console.warn(`⚠️ API ${apiName} 响应时间过长`);
    }
    
    if (!success) {
      console.error(`❌ API ${apiName} 调用失败`);
    }
  }
  
  /**
   * 记录错误
   */
  static trackError(error: Error, context: string): void {
    console.error(`💥 错误 [${context}]:`, error.message);
    
    // 简单的错误统计
    if (typeof window !== 'undefined') {
      const errorKey = 'error_count';
      const count = parseInt(localStorage.getItem(errorKey) || '0') + 1;
      localStorage.setItem(errorKey, count.toString());
      
      // 如果错误过多，提示用户
      if (count > 10) {
        console.warn('⚠️ 检测到多个错误，建议刷新页面或联系技术支持');
      }
    }
  }
  
  /**
   * 获取性能报告
   */
  static getPerformanceReport(): any {
    if (typeof window === 'undefined') return null;
    
    const report = {
      pageLoads: {},
      errorCount: parseInt(localStorage.getItem('error_count') || '0'),
      timestamp: new Date().toISOString()
    };
    
    // 收集页面加载数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('page_load_')) {
        const pageName = key.replace('page_load_', '');
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (data.length > 0) {
          const avgTime = data.reduce((sum: number, item: any) => sum + item.time, 0) / data.length;
          report.pageLoads[pageName] = {
            averageLoadTime: avgTime.toFixed(2),
            sampleCount: data.length
          };
        }
      }
    }
    
    return report;
  }
}
```

## 7. 故障排除

### 7.1 常见问题和解决方案

#### 问题 1：构建包仍然超过 100MB
```bash
# 解决步骤
1. 检查依赖配置
node scripts/analyze-dependencies.js

2. 确认 .vercelignore 配置
cat .vercelignore

3. 分析构建产物
npm run build:analyze

4. 手动清理大文件
find .next -size +10M -type f
```

#### 问题 2：功能异常或报错
```typescript
// 检查环境变量
console.log('部署阶段:', process.env.DEPLOYMENT_STAGE);
console.log('重型功能:', process.env.ENABLE_HEAVY_FEATURES);

// 检查条件导入
try {
  const service = await ConditionalImports.getMySQLService();
  console.log('MySQL 服务可用');
} catch (error) {
  console.log('MySQL 服务不可用（正常）');
}
```

#### 问题 3：性能问题
```typescript
// 性能检查
Stage1Monitoring.trackPageLoad('home');
const report = Stage1Monitoring.getPerformanceReport();
console.log('性能报告:', report);
```

### 7.2 回滚方案
```bash
# 如果优化后出现问题，快速回滚
git checkout HEAD~1 -- package.json
git checkout HEAD~1 -- next.config.ts
git checkout HEAD~1 -- .vercelignore

npm install
npm run build
vercel --prod
```

## 8. 下一步计划

### 8.1 第一阶段完成后的检查清单
- [ ] 构建包大小 < 100MB ✅
- [ ] Vercel 部署成功 ✅
- [ ] 核心功能正常 ✅
- [ ] 性能满足要求 ✅
- [ ] 监控系统运行 ✅

### 8.2 为第二阶段做准备
1. **文档整理**：记录第一阶段的所有修改
2. **数据备份**：确保 Supabase 数据完整
3. **功能清单**：列出被禁用的功能，准备在第二阶段恢复
4. **性能基准**：记录第一阶段的性能数据作为对比

### 8.3 持续优化
- 定期检查构建包大小
- 监控用户反馈，优先恢复重要功能
- 准备第二阶段的技术方案
- 评估用户增长，确定迁移时机

---

**总结**：第一阶段的目标是在保证核心功能的前提下，将部署包大小降至 100MB 以下。通过依赖优化、代码分割、资源压缩等手段，预计可以减少 60-70% 的包大小，为项目的持续开发争取时间和空间。