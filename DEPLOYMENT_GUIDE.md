# 云端部署指南

## 项目状态
✅ 项目构建成功  
✅ 部署配置文件已准备  
✅ 环境变量配置已创建  
⚠️ 存在少量ESLint警告（不影响部署）

## 部署步骤

### 方式一：使用Vercel CLI（推荐）

1. **登录Vercel**
   ```bash
   vercel login
   ```

2. **初始化项目**
   ```bash
   vercel
   ```
   - 选择创建新项目或链接现有项目
   - 确认项目设置

3. **配置环境变量**
   - 在Vercel Dashboard中设置生产环境变量
   - 参考 `.env.production` 文件中的配置
   - 重要变量包括：
     - `DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `REDIS_URL`
     - 各种API密钥

4. **部署**
   ```bash
   vercel --prod
   ```

### 方式二：通过Git集成

1. **推送代码到Git仓库**
   ```bash
   git add .
   git commit -m "准备生产部署"
   git push origin main
   ```

2. **在Vercel Dashboard中**
   - 导入Git仓库
   - 配置构建设置
   - 设置环境变量
   - 触发部署

## 环境变量配置

### 必需的环境变量
```
# 数据库
DATABASE_URL=your_production_database_url

# 身份验证
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.vercel.app

# Redis
REDIS_URL=your_redis_url

# AI服务
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# 阿里云服务
ALIYUN_ACCESS_KEY_ID=your_access_key
ALIYUN_ACCESS_KEY_SECRET=your_secret_key
ALIYUN_OSS_BUCKET=your_bucket_name
ALIYUN_OSS_REGION=your_region
```

## 部署后检查

1. **访问应用**
   - 检查首页是否正常加载
   - 测试用户登录功能
   - 验证数据库连接

2. **监控日志**
   - 在Vercel Dashboard查看函数日志
   - 检查是否有运行时错误

3. **性能优化**
   - 检查页面加载速度
   - 验证CDN缓存配置
   - 监控API响应时间

## 常见问题

### 构建失败
- 检查依赖项是否完整
- 确认TypeScript类型错误已修复
- 验证环境变量配置

### 运行时错误
- 检查数据库连接字符串
- 验证API密钥配置
- 确认Redis连接

### 性能问题
- 启用图片优化
- 配置适当的缓存策略
- 使用CDN加速静态资源

## 安全建议

1. **环境变量安全**
   - 不要在代码中硬编码敏感信息
   - 使用Vercel的环境变量管理
   - 定期轮换API密钥

2. **访问控制**
   - 配置适当的CORS策略
   - 启用速率限制
   - 实施适当的身份验证

3. **监控和日志**
   - 设置错误监控
   - 配置性能监控
   - 定期检查安全日志

## 联系支持

如果遇到部署问题，请检查：
1. Vercel文档：https://vercel.com/docs
2. Next.js部署指南：https://nextjs.org/docs/deployment
3. 项目日志和错误信息