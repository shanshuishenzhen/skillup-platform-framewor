# SkillUp Platform Vercel部署指南

## 概述

本指南详细说明如何将SkillUp Platform部署到Vercel平台，包括环境配置、部署步骤和故障排除。

## 前置条件

- [x] Node.js 18+ 已安装
- [x] Vercel CLI 已安装 (`npm i -g vercel`)
- [x] GitHub账户（推荐用于自动部署）
- [x] Supabase项目已配置

## 部署步骤

### 1. 环境变量配置

在Vercel控制台中设置以下环境变量：

#### 必需的环境变量

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://dadngnjejmxmoxakrcgj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 安全配置
JWT_SECRET=sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3
API_SECRET_KEY=sk1llup_4p1_s3cr3t_k3y_f0r_jwt_t0k3ns_2024_v3ry_s3cur3
ENCRYPTION_KEY=sk1llup_3ncrypt10n_k3y_32_ch4rs_l0ng
SESSION_SECRET=sk1llup_s3ss10n_s3cr3t_k3y_2024_r4nd0m_str1ng

# 应用配置
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
ALLOWED_ORIGINS=https://your-app.vercel.app
```

#### 可选的环境变量

```bash
# AI服务配置（如果使用）
DEEPSEEK_API_KEY=your_production_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 人脸识别配置（如果使用）
BAIDU_API_KEY=your_production_baidu_api_key
BAIDU_SECRET_KEY=your_production_baidu_secret_key

# 限流和安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FACE_AUTH_RATE_LIMIT_MAX=10

# 文件上传配置
MAX_FILE_SIZE_MB=10
MAX_IMAGE_SIZE_MB=5

# 人脸识别阈值
FACE_CONFIDENCE_THRESHOLD=80
FACE_QUALITY_THRESHOLD=70
LIVENESS_THRESHOLD=0.8
```

### 2. 部署方法

#### 方法一：GitHub自动部署（推荐）

1. 将代码推送到GitHub仓库
2. 在Vercel控制台中连接GitHub仓库
3. 配置环境变量
4. 触发自动部署

#### 方法二：Vercel CLI部署

```bash
# 1. 运行部署前检查
npm run vercel:check

# 2. 登录Vercel
vercel login

# 3. 部署到预览环境
npm run deploy:preview

# 4. 部署到生产环境
npm run deploy:vercel
```

#### 方法三：手动部署

```bash
# 1. 构建项目
npm run build

# 2. 部署
vercel --prod
```

### 3. 部署后验证

#### 健康检查

访问以下端点验证部署状态：

- `https://your-app.vercel.app/api/health` - 基本健康检查
- `https://your-app.vercel.app/api/status` - 详细状态信息
- `https://your-app.vercel.app/` - 主页面

#### 功能测试

1. **用户注册/登录**
   - 测试用户注册功能
   - 测试用户登录功能
   - 验证JWT令牌生成

2. **数据库连接**
   - 测试Supabase连接
   - 验证数据读写功能

3. **API端点**
   - 测试关键API端点
   - 验证认证中间件

## 配置文件说明

### vercel.json

```json
{
  "framework": "nextjs",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "NODE_ENV": "production",
    "NEXT_TELEMETRY_DISABLED": "1",
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "JWT_SECRET": "@jwt_secret",
    "API_SECRET_KEY": "@api_secret_key",
    "ENCRYPTION_KEY": "@encryption_key",
    "SESSION_SECRET": "@session_secret"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    },
    "app/api/ai/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### next.config.js

确保配置了正确的输出模式和优化设置：

```javascript
module.exports = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  // 其他配置...
}
```

## 故障排除

### 常见问题

#### 1. 构建失败

**问题**: 构建过程中出现错误

**解决方案**:
- 检查依赖项版本兼容性
- 运行 `npm run vercel:check` 验证配置
- 查看构建日志中的具体错误信息

#### 2. 环境变量未生效

**问题**: 应用无法读取环境变量

**解决方案**:
- 确保在Vercel控制台中正确设置了环境变量
- 检查变量名是否与代码中一致
- 重新部署应用

#### 3. 数据库连接失败

**问题**: 无法连接到Supabase数据库

**解决方案**:
- 验证Supabase URL和密钥是否正确
- 检查Supabase项目状态
- 确认网络连接正常

#### 4. API路由404错误

**问题**: API端点返回404错误

**解决方案**:
- 检查API路由文件结构
- 验证vercel.json中的重写规则
- 确认函数配置正确

### 调试工具

#### Vercel CLI命令

```bash
# 查看部署状态
vercel ls

# 查看部署日志
vercel logs

# 查看函数日志
vercel logs --follow

# 本地开发
vercel dev
```

#### 监控和日志

- 使用Vercel控制台查看实时日志
- 配置错误监控和告警
- 使用浏览器开发者工具调试前端问题

## 性能优化

### 构建优化

1. **代码分割**
   - 使用动态导入
   - 优化包大小

2. **静态资源优化**
   - 图片压缩和优化
   - 使用CDN加速

3. **缓存策略**
   - 配置适当的缓存头
   - 使用Vercel Edge Cache

### 运行时优化

1. **函数配置**
   - 设置合适的超时时间
   - 优化内存使用

2. **数据库优化**
   - 使用连接池
   - 优化查询性能

## 安全考虑

### 环境变量安全

- 不要在代码中硬编码敏感信息
- 使用Vercel的环境变量管理
- 定期轮换密钥和令牌

### HTTPS和安全头

- Vercel自动提供HTTPS
- 配置安全响应头
- 启用CORS保护

## 成本优化

### Vercel计费

- 监控函数执行时间
- 优化构建时间
- 合理使用带宽

### 资源使用

- 监控内存和CPU使用
- 优化数据库查询
- 使用缓存减少计算

## 维护和更新

### 定期任务

- 更新依赖项
- 监控性能指标
- 备份重要数据

### 版本管理

- 使用语义化版本
- 维护更新日志
- 测试新版本部署

## 支持和资源

- [Vercel官方文档](https://vercel.com/docs)
- [Next.js部署指南](https://nextjs.org/docs/deployment)
- [Supabase文档](https://supabase.com/docs)

---

**注意**: 请确保在生产环境中使用强密码和安全的API密钥。定期更新依赖项和安全补丁。