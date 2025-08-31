# SkillUp Platform 部署指南

本文档提供了 SkillUp Platform 的完整部署指南，包括环境配置、部署步骤和故障排除。

## 📋 目录

- [部署前准备](#部署前准备)
- [环境变量配置](#环境变量配置)
- [Vercel 部署](#vercel-部署)
- [手动部署](#手动部署)
- [部署验证](#部署验证)
- [故障排除](#故障排除)
- [回滚策略](#回滚策略)
- [监控和维护](#监控和维护)

## 🚀 部署前准备

### 系统要求

- Node.js 18.0 或更高版本
- npm 8.0 或更高版本
- Git
- Vercel CLI（可选）

### 依赖检查

在部署前，请运行以下命令检查项目状态：

```bash
# 安装依赖
npm install

# 运行部署前检查
npm run deploy:check

# 运行测试
npm run test:ci

# 检查代码质量
npm run lint
```

## 🔧 环境变量配置

### 必需环境变量

创建 `.env.production` 文件并配置以下变量：

```env
# 应用配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证配置
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min
NEXTAUTH_URL=https://your-domain.vercel.app
SESSION_SECRET=your-session-secret-32-chars-min
```

### 可选环境变量

```env
# 数据库配置（如果使用外部数据库）
DATABASE_URL=postgresql://user:password@host:port/database

# Redis 配置（如果使用缓存）
REDIS_URL=redis://user:password@host:port

# AI 服务配置
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key

# 监控配置
MONITORING_ENDPOINT=https://your-monitoring-service.com/api
MONITORING_API_KEY=your-monitoring-api-key
```

### 环境变量安全性

⚠️ **重要提醒**：
- 永远不要在代码中硬编码敏感信息
- 使用 Vercel 环境变量管理功能
- 定期轮换 API 密钥
- 为不同环境使用不同的密钥

## 🌐 Vercel 部署

### 方法一：GitHub 集成（推荐）

1. **连接 GitHub 仓库**
   ```bash
   # 推送代码到 GitHub
   git add .
   git commit -m "准备部署"
   git push origin main
   ```

2. **在 Vercel 中导入项目**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 选择 GitHub 仓库
   - 配置项目设置

3. **配置环境变量**
   - 在 Vercel 项目设置中添加环境变量
   - 确保所有必需变量都已配置
   - 设置不同环境的变量值

4. **部署**
   - Vercel 会自动检测 Next.js 项目
   - 自动运行构建和部署
   - 每次推送到 main 分支都会触发部署

### 方法二：Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署到预览环境**
   ```bash
   npm run deploy:preview
   ```

4. **部署到生产环境**
   ```bash
   npm run deploy:vercel
   ```

### 方法三：手动部署

```bash
# 1. 运行部署前检查
npm run deploy:check

# 2. 构建项目
npm run build:production

# 3. 部署
vercel --prod
```

## 🔨 手动部署

### 部署到其他平台

如果不使用 Vercel，可以部署到其他平台：

#### Netlify

1. **构建配置**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   ```

2. **部署**
   ```bash
   npm run build
   # 上传 .next 目录到 Netlify
   ```

#### Railway

1. **创建 railway.json**
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

2. **部署**
   ```bash
   railway login
   railway link
   railway up
   ```

#### Docker 部署

1. **创建 Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **构建和运行**
   ```bash
   docker build -t skillup-platform .
   docker run -p 3000:3000 skillup-platform
   ```

## ✅ 部署验证

### 自动验证

部署完成后，运行以下检查：

```bash
# 检查部署状态
curl -f https://your-domain.vercel.app/api/health

# 检查主要页面
curl -f https://your-domain.vercel.app/
curl -f https://your-domain.vercel.app/dashboard
```

### 手动验证清单

- [ ] 主页正常加载
- [ ] 用户注册/登录功能正常
- [ ] API 端点响应正常
- [ ] 数据库连接正常
- [ ] 静态资源加载正常
- [ ] 移动端适配正常
- [ ] 性能指标符合预期

### 性能检查

```bash
# 使用 Lighthouse 检查性能
npx lighthouse https://your-domain.vercel.app --output=html

# 检查加载时间
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.vercel.app
```

## 🔧 故障排除

### 常见问题

#### 1. 构建失败

**症状**：部署时构建过程失败

**解决方案**：
```bash
# 检查本地构建
npm run build

# 检查依赖
npm audit
npm audit fix

# 清理缓存
npm run clean
rm -rf .next node_modules
npm install
```

#### 2. 环境变量问题

**症状**：应用运行时出现配置错误

**解决方案**：
- 检查 Vercel 环境变量设置
- 确认变量名称拼写正确
- 验证变量值格式
- 检查变量作用域（开发/预览/生产）

#### 3. API 路由 404

**症状**：API 请求返回 404 错误

**解决方案**：
- 检查 `vercel.json` 配置
- 确认 API 路由文件位置
- 检查函数超时设置
- 验证路由命名规范

#### 4. 数据库连接失败

**症状**：无法连接到数据库

**解决方案**：
- 检查数据库 URL 格式
- 验证数据库服务状态
- 检查网络连接和防火墙
- 确认数据库用户权限

#### 5. 静态资源加载失败

**症状**：图片、CSS、JS 文件无法加载

**解决方案**：
- 检查资源路径
- 验证 CDN 配置
- 检查缓存设置
- 确认文件权限

### 调试工具

```bash
# 查看 Vercel 部署日志
vercel logs

# 查看函数日志
vercel logs --follow

# 本地调试
npm run dev

# 生产模式本地测试
npm run build
npm run start
```

## 🔄 回滚策略

### Vercel 回滚

1. **通过 Dashboard**
   - 访问 Vercel 项目页面
   - 选择 "Deployments" 标签
   - 找到稳定版本
   - 点击 "Promote to Production"

2. **通过 CLI**
   ```bash
   # 查看部署历史
   vercel ls
   
   # 回滚到指定版本
   vercel promote <deployment-url>
   ```

### Git 回滚

```bash
# 回滚到上一个提交
git revert HEAD
git push origin main

# 回滚到指定提交
git revert <commit-hash>
git push origin main

# 强制回滚（谨慎使用）
git reset --hard <commit-hash>
git push --force origin main
```

### 数据库回滚

```bash
# 如果有数据库迁移问题
npm run db:rollback

# 恢复数据库备份
npm run db:restore
```

## 📊 监控和维护

### 性能监控

- **Vercel Analytics**：自动启用
- **Web Vitals**：监控核心性能指标
- **Error Tracking**：使用 Sentry 或类似服务
- **Uptime Monitoring**：使用 UptimeRobot 或类似服务

### 定期维护

```bash
# 每周执行
npm audit
npm update

# 每月执行
npm outdated
npm run security:check

# 每季度执行
npm run db:backup
npm run security:rotate-keys
```

### 备份策略

- **代码备份**：Git 仓库
- **数据库备份**：定期自动备份
- **环境配置备份**：安全存储环境变量
- **部署配置备份**：版本控制所有配置文件

## 📞 支持和联系

如果在部署过程中遇到问题：

1. 查看本文档的故障排除部分
2. 检查项目的 GitHub Issues
3. 查看 Vercel 官方文档
4. 联系技术支持团队

---

**最后更新**：2025年1月
**版本**：1.0.0
**维护者**：SkillUp Platform Team