# 阿里云生产环境部署指南

本文档详细说明如何将 SkillUp Platform 部署到阿里云生产环境。

## 目录结构

```
deploy/alicloud/
├── Dockerfile              # Docker 镜像构建文件
├── docker-compose.yml      # Docker Compose 配置
├── nginx.conf              # Nginx 反向代理配置
├── redis.conf              # Redis 缓存配置
├── deploy.sh               # 自动化部署脚本
├── k8s-deployment.yaml     # Kubernetes 部署配置
└── README.md               # 部署说明文档
```

## 前置要求

### 1. 阿里云服务

- **ECS 实例**: 至少 2核4GB 内存
- **OSS 对象存储**: 用于文件存储
- **RDS 数据库**: MySQL 8.0 或 PostgreSQL 13+
- **CDN 加速**: 用于静态资源加速
- **容器镜像服务**: 用于存储 Docker 镜像
- **负载均衡 SLB**: 用于高可用部署

### 2. 本地工具

- Docker 20.10+
- Docker Compose 2.0+
- kubectl (如果使用 Kubernetes)
- 阿里云 CLI (可选)

## 环境配置

### 1. 创建环境变量文件

复制 `.env.production` 文件并填入实际配置：

```bash
cp .env.production .env.local
```

### 2. 必需的环境变量

```bash
# 阿里云配置
ALICLOUD_ACCESS_KEY_ID=your_access_key_id
ALICLOUD_ACCESS_KEY_SECRET=your_access_key_secret
ALICLOUD_REGION=cn-shenzhen
ALICLOUD_OSS_BUCKET=your_oss_bucket
ALICLOUD_OSS_ENDPOINT=https://oss-cn-shenzhen.aliyuncs.com

# 数据库配置
ALICLOUD_RDS_HOST=your_rds_host
ALICLOUD_RDS_PORT=3306
ALICLOUD_RDS_DATABASE=skillup_platform
ALICLOUD_RDS_USERNAME=your_username
ALICLOUD_RDS_PASSWORD=your_password

# CDN 配置
ALICLOUD_CDN_DOMAIN=your_cdn_domain

# 安全配置
ENCRYPTION_KEY=your_32_char_encryption_key
API_SECRET_KEY=your_api_secret_key
SESSION_SECRET=your_session_secret
```

## 部署方式

### 方式一：Docker Compose 部署

#### 1. 快速部署

```bash
# 设置执行权限
chmod +x deploy/alicloud/deploy.sh

# 执行部署
./deploy/alicloud/deploy.sh
```

#### 2. 手动部署

```bash
# 构建镜像
docker build -t skillup-platform:latest -f deploy/alicloud/Dockerfile .

# 启动服务
docker-compose -f deploy/alicloud/docker-compose.yml up -d

# 查看服务状态
docker-compose -f deploy/alicloud/docker-compose.yml ps
```

#### 3. 部署参数

```bash
# 指定镜像标签
./deploy.sh --tag v1.0.0

# 指定镜像仓库
./deploy.sh --registry registry.cn-shenzhen.aliyuncs.com

# 指定命名空间
./deploy.sh --namespace skillup

# 回滚到上一版本
./deploy.sh --rollback
```

### 方式二：Kubernetes 部署

#### 1. 创建命名空间

```bash
kubectl apply -f deploy/alicloud/k8s-deployment.yaml
```

#### 2. 配置镜像拉取密钥

```bash
kubectl create secret docker-registry alicloud-registry-secret \
  --docker-server=registry.cn-shenzhen.aliyuncs.com \
  --docker-username=your_access_key_id \
  --docker-password=your_access_key_secret \
  --namespace=skillup-platform
```

#### 3. 更新配置

编辑 `k8s-deployment.yaml` 文件，更新以下配置：

- 镜像地址
- 域名配置
- 环境变量
- 资源限制

#### 4. 部署应用

```bash
# 应用配置
kubectl apply -f deploy/alicloud/k8s-deployment.yaml

# 查看部署状态
kubectl get pods -n skillup-platform
kubectl get services -n skillup-platform
kubectl get ingress -n skillup-platform
```

## 服务配置

### 1. Nginx 配置

- **SSL/TLS**: 配置 HTTPS 证书
- **Gzip 压缩**: 启用静态资源压缩
- **缓存策略**: 配置静态资源缓存
- **安全头**: 添加安全响应头

### 2. Redis 配置

- **持久化**: 启用 RDB 和 AOF
- **内存限制**: 设置最大内存使用
- **安全**: 配置访问密码
- **监控**: 启用慢查询日志

### 3. 应用配置

- **环境变量**: 生产环境配置
- **资源限制**: CPU 和内存限制
- **健康检查**: 配置存活和就绪探针
- **日志**: 配置日志输出

## 监控和维护

### 1. 健康检查

```bash
# 应用健康检查
curl -f http://localhost:3000/api/health

# Nginx 健康检查
curl -f http://localhost/nginx-health

# 容器状态检查
docker-compose ps
```

### 2. 日志查看

```bash
# 应用日志
docker-compose logs -f skillup-app

# Nginx 日志
docker-compose logs -f nginx

# Redis 日志
docker-compose logs -f redis
```

### 3. 性能监控

```bash
# 容器资源使用
docker stats

# 系统资源监控
top
htop
iostat
```

### 4. 备份策略

```bash
# 数据库备份
mysqldump -h $RDS_HOST -u $RDS_USER -p $RDS_DATABASE > backup.sql

# Redis 备份
redis-cli --rdb backup.rdb

# 文件备份
ossutil cp -r /app/data oss://your-bucket/backup/
```

## 扩容和优化

### 1. 水平扩容

```bash
# Docker Compose 扩容
docker-compose up -d --scale skillup-app=3

# Kubernetes 扩容
kubectl scale deployment skillup-app --replicas=5 -n skillup-platform
```

### 2. 性能优化

- **CDN 配置**: 启用阿里云 CDN 加速
- **数据库优化**: 配置 RDS 参数组
- **缓存策略**: 优化 Redis 缓存
- **镜像优化**: 使用多阶段构建减小镜像大小

### 3. 安全加固

- **网络安全**: 配置安全组规则
- **访问控制**: 启用 RAM 访问控制
- **数据加密**: 启用 RDS 和 OSS 加密
- **审计日志**: 启用操作审计

## 故障排除

### 1. 常见问题

#### 应用无法启动

```bash
# 检查环境变量
docker-compose config

# 查看详细日志
docker-compose logs --details skillup-app

# 检查端口占用
netstat -tlnp | grep 3000
```

#### 数据库连接失败

```bash
# 测试数据库连接
mysql -h $RDS_HOST -u $RDS_USER -p

# 检查网络连通性
telnet $RDS_HOST 3306

# 查看安全组配置
```

#### OSS 访问失败

```bash
# 测试 OSS 连接
ossutil ls oss://your-bucket/

# 检查访问密钥
ossutil config

# 查看 Bucket 权限
```

### 2. 回滚操作

```bash
# 快速回滚
./deploy.sh --rollback

# 手动回滚
docker-compose down
docker tag skillup-platform:previous skillup-platform:latest
docker-compose up -d
```

## 联系支持

如果在部署过程中遇到问题，请联系技术支持：

- **邮箱**: support@skillup-platform.com
- **电话**: 400-xxx-xxxx
- **地址**: 广东省深圳市龙岗区中粮祥云2A2605

## 更新日志

- **v1.0.0**: 初始版本，支持 Docker Compose 和 Kubernetes 部署
- **v1.1.0**: 添加自动化部署脚本和监控配置
- **v1.2.0**: 优化性能配置和安全加固