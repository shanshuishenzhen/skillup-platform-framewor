# 局域网部署专用 Dockerfile
# 针对本地环境优化，减少构建时间和镜像大小

# 使用官方 Node.js 18 Alpine 镜像作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    libc6-compat \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖阶段
FROM base AS deps

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 构建阶段
FROM base AS builder

# 复制所有依赖
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN npm run build

# 生产运行阶段
FROM base AS runner

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建必要的目录
RUN mkdir -p /app/uploads /app/logs /app/.next
RUN chown -R nextjs:nodejs /app

# 复制生产依赖
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制必要的配置文件
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# 复制数据库迁移文件
COPY --from=builder --chown=nextjs:nodejs /app/supabase ./supabase

# 复制API目录
COPY --from=builder --chown=nextjs:nodejs /app/api ./api

# 设置权限
RUN chmod +x /app/server.js || true

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["node", "server.js"]

# 构建信息标签
LABEL maintainer="SkillUp Platform Team"
LABEL version="1.0.0"
LABEL description="SkillUp Platform - LAN Deployment"
LABEL build-date="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# 多阶段构建说明:
# 1. base: 基础环境设置
# 2. deps: 安装生产依赖
# 3. builder: 构建应用
# 4. runner: 最终运行环境

# 优化特性:
# - 使用 Alpine Linux 减少镜像大小
# - 多阶段构建减少最终镜像层数
# - 非root用户运行提高安全性
# - 健康检查确保服务可用性
# - 缓存优化加速构建过程