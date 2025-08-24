# 局域网C/S架构部署指南

本文档详细说明如何在局域网环境中部署 SkillUp Platform，实现一台电脑作为服务器，其他电脑作为客户端的C/S架构。

## 部署架构

```
局域网环境 (192.168.1.0/24)
├── 服务器 (192.168.1.100)
│   ├── Next.js 应用 (端口 3000)
│   ├── Supabase 本地实例 (端口 54321)
│   ├── Redis 缓存 (端口 6379)
│   └── Nginx 反向代理 (端口 80/443)
└── 客户端 (192.168.1.101-254)
    └── 浏览器访问 http://192.168.1.100
```

## 服务器配置要求

### 硬件要求
- **CPU**: 4核心以上
- **内存**: 8GB以上
- **存储**: 100GB以上可用空间
- **网络**: 千兆网卡

### 软件要求
- **操作系统**: Windows 10/11 或 Windows Server
- **Node.js**: 18.0+
- **Docker Desktop**: 最新版本
- **Git**: 最新版本

## 快速部署步骤

### 1. 服务器端配置

#### 步骤1: 克隆项目
```powershell
# 在服务器上克隆项目
git clone https://github.com/shanshuishenzhen/skillup-platform-framewor.git
cd skillup-platform-framewor
```

#### 步骤2: 安装依赖
```powershell
# 安装Node.js依赖
npm install

# 安装Docker Desktop (如果未安装)
# 下载并安装: https://www.docker.com/products/docker-desktop/
```

#### 步骤3: 配置环境变量
```powershell
# 复制环境配置文件
copy .env.example .env.local

# 编辑 .env.local 文件，配置局域网环境
notepad .env.local
```

#### 步骤4: 启动服务
```powershell
# 使用Docker Compose启动所有服务
docker-compose -f deploy/lan/docker-compose.yml up -d

# 或者手动启动
npm run build
npm run start
```

### 2. 客户端配置

客户端无需特殊配置，只需要:
1. 确保与服务器在同一局域网
2. 使用现代浏览器访问服务器IP地址
3. 建议使用Chrome、Firefox、Edge等浏览器

## 详细配置说明

### 环境变量配置 (.env.local)

```bash
# 基础配置
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000

# 数据库配置 (使用本地Supabase)
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.100:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key

# Redis配置
REDIS_URL=redis://192.168.1.100:6379

# 安全配置
ENCRYPTION_KEY=your_32_character_encryption_key_here
API_SECRET_KEY=your_api_secret_key_for_jwt_tokens
SESSION_SECRET=your_session_secret_key

# CORS配置 (允许局域网访问)
ALLOWED_ORIGINS=http://192.168.1.100:3000,http://192.168.1.*

# 文件上传配置
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads

# AI服务配置 (可选)
OPENAI_API_KEY=your_openai_api_key_here
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key
```

### 网络配置

#### 防火墙设置
```powershell
# 允许端口访问 (以管理员身份运行)
netsh advfirewall firewall add rule name="SkillUp Platform HTTP" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="SkillUp Platform HTTPS" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="Supabase" dir=in action=allow protocol=TCP localport=54321
```

#### 获取服务器IP地址
```powershell
# 查看本机IP地址
ipconfig

# 或者使用PowerShell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}
```

### 数据库初始化

```powershell
# 初始化数据库
npm run init-db

# 运行数据库迁移
npm run db:migrate
```

## 服务管理

### 启动服务
```powershell
# 开发模式启动
npm run dev

# 生产模式启动
npm run build
npm run start

# 使用Docker启动
docker-compose -f deploy/lan/docker-compose.yml up -d
```

### 停止服务
```powershell
# 停止Node.js服务
# Ctrl+C (如果在前台运行)

# 停止Docker服务
docker-compose -f deploy/lan/docker-compose.yml down
```

### 服务状态检查
```powershell
# 检查端口占用
netstat -an | findstr :3000

# 检查Docker容器状态
docker ps

# 检查应用健康状态
curl http://192.168.1.100:3000/api/health
```

## 客户端访问指南

### 访问地址
- **主页**: http://192.168.1.100:3000
- **管理后台**: http://192.168.1.100:3000/admin
- **API文档**: http://192.168.1.100:3000/api/docs

### 浏览器兼容性
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

### 移动端访问
- 支持响应式设计
- 可在手机、平板上正常访问
- 建议使用现代移动浏览器

## 性能优化

### 服务器优化
```powershell
# 设置Node.js内存限制
set NODE_OPTIONS=--max-old-space-size=4096

# 启用生产模式优化
set NODE_ENV=production
```

### 网络优化
- 使用千兆交换机
- 确保服务器有线连接
- 客户端可使用WiFi或有线连接

## 故障排除

### 常见问题

#### 1. 无法访问服务器
```powershell
# 检查服务是否运行
netstat -an | findstr :3000

# 检查防火墙设置
netsh advfirewall show allprofiles

# 测试网络连通性
ping 192.168.1.100
```

#### 2. 数据库连接失败
```powershell
# 检查Supabase服务
docker ps | findstr supabase

# 查看数据库日志
docker logs supabase-db
```

#### 3. 文件上传失败
```powershell
# 检查上传目录权限
dir uploads

# 创建上传目录
mkdir uploads
```

### 日志查看
```powershell
# 应用日志
npm run logs

# Docker日志
docker-compose -f deploy/lan/docker-compose.yml logs

# 系统日志
Get-EventLog -LogName Application -Source "Node.js"
```

## 安全注意事项

### 网络安全
- 仅在可信局域网环境使用
- 不要将服务暴露到公网
- 定期更新系统和软件

### 数据安全
- 定期备份数据库
- 使用强密码
- 启用访问日志记录

### 访问控制
- 配置用户权限
- 启用会话管理
- 设置合理的超时时间

## 备份和恢复

### 数据备份
```powershell
# 备份数据库
npm run db:backup

# 备份上传文件
robocopy uploads backup\uploads /E

# 备份配置文件
copy .env.local backup\.env.backup
```

### 数据恢复
```powershell
# 恢复数据库
npm run db:restore backup\database.sql

# 恢复上传文件
robocopy backup\uploads uploads /E
```

## 升级和维护

### 系统升级
```powershell
# 拉取最新代码
git pull origin main

# 更新依赖
npm update

# 重新构建
npm run build

# 重启服务
npm run start
```

### 定期维护
- 每周检查系统状态
- 每月清理日志文件
- 每季度更新依赖包
- 每年更新操作系统

## 技术支持

如遇到问题，请按以下顺序排查：
1. 查看本文档的故障排除部分
2. 检查系统日志和应用日志
3. 查看GitHub项目的Issues页面
4. 联系技术支持团队

---

**注意**: 此部署方案仅适用于内部测试和开发环境，不建议用于生产环境。生产环境请使用云端部署方案。