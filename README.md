# SkillUp - 技能提升在线学习平台

欢迎来到 SkillUp 项目！这是一个功能完整的在线技能学习平台，集成了现代化的技术栈和丰富的功能模块。本项目面向各行业从业者，提供技能培训学习、技能等级考试、人脸识别认证、短信验证等全方位的在线学习服务。

## 1. 技术栈 (Tech Stack)

本项目基于以下现代技术栈构建，以确保高性能、良好的开发体验和可扩展性：

### 前端技术
- **框架**: [React](https://react.dev/) 19.1.0 + [Next.js](https://nextjs.org/) 15.4.6 (App Router)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/) 4.x + [Radix UI](https://www.radix-ui.com/)
- **语言**: [TypeScript](https://www.typescriptlang.org/) 5.x
- **图标**: [Lucide React](https://lucide.dev/)
- **状态管理**: React Hooks + Context API

### 后端技术
- **API**: Next.js API Routes
- **数据库**: [Supabase](https://supabase.com/) (PostgreSQL)
- **认证**: JWT + bcryptjs
- **文件存储**: 阿里云 OSS
- **缓存**: Redis

### 第三方服务集成
- **短信服务**: 阿里云短信服务
- **人脸识别**: 百度AI人脸识别
- **AI服务**: OpenAI GPT
- **监控**: 自定义监控系统

### 开发工具
- **包管理器**: npm
- **代码检查**: ESLint
- **测试框架**: Jest + Supertest
- **API文档**: OpenAPI 3.0

## 2. 🚀 一键启动 (Quick Start)

**最简单的启动方式 - 一键启动功能：**

### Windows 用户
```bash
# 双击运行或在命令行执行
start.bat
```

### Linux/Mac 用户
```bash
# 添加执行权限并运行
chmod +x start.sh
./start.sh
```

### 使用 Node.js 直接启动
```bash
node start.js
# 或者
npm run quick-start
```

**一键启动功能包含：**
- ✅ 自动环境检查（Node.js、npm版本）
- ✅ 自动安装依赖包
- ✅ 自动初始化SQLite数据库
- ✅ 自动插入示例数据
- ✅ 智能端口检测
- ✅ 自动打开浏览器

## 3. 传统启动方式 (Manual Setup)

如果您希望手动控制启动过程，请遵循以下步骤：

1.  **进入项目目录**:
    ```bash
    cd skillup-platform
    ```

2.  **安装依赖**:
    ```bash
    npm install
    ```

3.  **启动开发服务器**:
    ```bash
    npm run dev
    ```

4.  **访问应用**:
    在您的浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看运行效果。

## 4. 数据库和示例数据

一键启动会自动创建以下示例账户供测试使用：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 系统管理员 |
| teacher1 | teacher123 | 教师 | 金融学院教师 |
| teacher2 | teacher123 | 教师 | 医学院教师 |
| student1 | student123 | 学生 | 计算机系学生 |
| student2 | student123 | 学生 | 金融系学生 |

**数据库文件位置**: `./data/skillup.db`

**独立操作**:
```bash
# 仅初始化数据库
npm run init-db

# 仅检查环境
npm run check-env

# 测试启动功能
node test-startup.js
```

## 5. 项目结构导览 (Project Structure)

本项目的结构经过精心设计，以实现关注点分离和未来的可扩展性。

```
skillup-platform/
├── public/               # 静态资源 (图片, 图标等)
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 认证页面组 (登录, 注册)
│   │   ├── api/          # 后端 API 接口
│   │   ├── courses/      # 课程相关页面
│   │   ├── layout.tsx    # 全局根布局
│   │   └── page.tsx      # 网站首页
│   ├── components/       # 可复用的 React 组件
│   │   ├── layout/       # 布局组件 (Header, Footer)
│   │   └── ui/           # 通用UI元素 (Button, Card, Input)
│   ├── lib/
│   │   └── db/
│   │       └── schema.ts # 数据库表结构定义 (TypeScript)
│   └── services/         # 后端业务逻辑层 (模拟微服务)
│       ├── userService.ts
│       ├── courseService.ts
│       └── aiService.ts
├── scripts/              # 🆕 启动和管理脚本
│   ├── init-database.js  # 数据库初始化脚本
│   ├── check-environment.js # 环境检查脚本
│   └── update-config.js  # 配置更新工具
├── data/                 # 🆕 数据库文件目录
│   └── skillup.db        # SQLite数据库文件
├── start.js              # 🆕 主启动脚本
├── start.bat             # 🆕 Windows批处理启动脚本
├── start.sh              # 🆕 Linux/Mac Shell启动脚本
├── start-config.json     # 🆕 启动配置文件
├── test-startup.js       # 🆕 启动功能测试脚本
├── START_GUIDE.md        # 🆕 详细使用指南
├── STARTUP_FEATURES.md   # 🆕 功能总结文档
├── tailwind.config.ts    # Tailwind CSS 配置文件
└── next.config.mjs       # Next.js 配置文件
```

- **`src/app`**: 存放所有页面和API路由。页面路由和API路由在这里统一管理。
- **`src/components`**: 存放所有可复用的UI组件。`ui` 目录用于原子组件，`layout` 用于页面结构组件。
- **`src/services`**: 存放核心业务逻辑。每个文件模拟一个微服务，负责处理特定领域的业务，如用户管理或课程管理。这使得未来将项目拆分为真实微服务变得更加容易。
- **`src/lib/db`**: 存放与数据库相关的代码，`schema.ts` 文件是数据库表的“代码形式”定义。

## 6. 核心功能模块

本平台已实现以下完整功能模块：

### 🎓 学习功能
- ✅ **技能培训学习**: 提供分类课程、学习进度跟踪、AI内容生成
- ✅ **技能等级考试**: 在线考试系统、成绩管理、证书颁发
- ✅ **学习进度管理**: 个人学习轨迹、进度统计、成就系统
- ✅ **课程管理**: 课程创建、编辑、发布、学员管理

### 🔐 认证与安全
- ✅ **用户认证系统**: 注册、登录、JWT令牌管理
- ✅ **短信验证码**: 阿里云短信服务集成、验证码发送与验证
- ✅ **人脸识别认证**: 百度AI人脸识别、二次认证、模板管理
- ✅ **权限管理**: 基于角色的访问控制(RBAC)

### 📊 管理与监控
- ✅ **管理员后台**: 用户管理、课程管理、数据统计
- ✅ **系统监控**: API监控、性能统计、错误追踪
- ✅ **审计日志**: 用户操作记录、系统日志管理
- ✅ **数据分析**: 学习数据分析、用户行为分析

### 🛠️ 技术服务
- ✅ **文件存储**: 阿里云OSS集成、文件上传下载
- ✅ **缓存服务**: Redis缓存、性能优化
- ✅ **邮件服务**: 邮件通知、模板管理
- ✅ **AI服务**: OpenAI集成、智能内容生成

### 🆕 一键启动功能
- ✅ **智能启动脚本**: 自动检查环境、安装依赖、初始化数据库
- ✅ **跨平台支持**: 提供Windows批处理和Linux/Mac Shell脚本
- ✅ **数据库自动化**: Supabase数据库自动迁移和示例数据
- ✅ **环境检查工具**: 全面的环境兼容性检查
- ✅ **配置管理**: 灵活的启动配置和更新工具
- ✅ **错误处理**: 完善的错误提示和故障排除
- ✅ **测试工具**: 完整的单元测试、集成测试、E2E测试
- ✅ **详细文档**: 完整的API文档和使用指南

## 7. API 接口文档

平台提供完整的RESTful API接口，支持以下功能模块：

### 认证相关 API
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/face-verify` - 人脸验证登录

### 短信验证 API
- `POST /api/sms/send` - 发送验证码
- `POST /api/sms/verify` - 验证验证码

### 人脸识别 API
- `POST /api/face-auth/register` - 注册人脸模板
- `POST /api/face-auth/verify` - 人脸验证
- `GET /api/face-auth/status` - 获取人脸认证状态

### 课程管理 API
- `GET /api/courses` - 获取课程列表
- `GET /api/courses/[courseId]` - 获取课程详情
- `POST /api/admin/courses` - 创建课程（管理员）

### 学习进度 API
- `GET /api/learning-progress` - 获取学习进度
- `POST /api/learning-progress` - 更新学习进度

### 监控统计 API
- `GET /api/monitoring/stats` - 获取系统统计
- `GET /api/monitoring/dashboard` - 监控面板数据

### 管理员 API
- `POST /api/admin/users/import` - 批量导入用户
- `POST /api/admin/resources/upload` - 上传学习资源

详细的API文档请参考：`docs/openapi.yaml`

## 8. 📚 相关文档

### 用户文档
- **[START_GUIDE.md](./START_GUIDE.md)** - 详细的一键启动使用指南
- **[STARTUP_FEATURES.md](./STARTUP_FEATURES.md)** - 一键启动功能完整说明
- **[SMS_VERIFICATION_TEST_REPORT.md](./SMS_VERIFICATION_TEST_REPORT.md)** - 短信验证功能测试报告

### 管理员文档
- **[docs/admin-manual.md](./docs/admin-manual.md)** - 管理员操作手册
- **[docs/admin-quick-reference.md](./docs/admin-quick-reference.md)** - 管理员快速参考
- **[docs/admin-training-script.md](./docs/admin-training-script.md)** - 管理员培训脚本
- **[ADMIN_GUIDE_SUMMARY.md](./ADMIN_GUIDE_SUMMARY.md)** - 管理员指南总结

### 技术文档
- **[docs/api-documentation.md](./docs/api-documentation.md)** - API接口文档
- **[docs/openapi.yaml](./docs/openapi.yaml)** - OpenAPI规范文档
- **[docs/security-config.md](./docs/security-config.md)** - 安全配置文档
- **[docs/monitoring.md](./docs/monitoring.md)** - 监控系统文档

### 部署文档
- **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** - 部署总结
- **[deploy/alicloud/README.md](./deploy/alicloud/README.md)** - 阿里云部署指南
- **[deploy/lan/README.md](./deploy/lan/README.md)** - 局域网部署指南

### 配置文件
- **`start-config.json`** - 启动行为配置
- **`.env.example`** - 环境变量示例
- **`.env.monitoring.example`** - 监控配置示例

## 9. 环境配置

### 必需的环境变量

创建 `.env.local` 文件并配置以下环境变量：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT 密钥
JWT_SECRET=your_jwt_secret_key

# 阿里云配置
ALICLOUD_ACCESS_KEY_ID=your_access_key_id
ALICLOUD_ACCESS_KEY_SECRET=your_access_key_secret
ALICLOUD_SMS_SIGN_NAME=your_sms_sign_name
ALICLOUD_SMS_TEMPLATE_CODE=your_sms_template_code

# 阿里云 OSS 配置
ALICLOUD_OSS_REGION=your_oss_region
ALICLOUD_OSS_BUCKET=your_oss_bucket

# 百度 AI 配置
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key

# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key

# Redis 配置
REDIS_URL=your_redis_url

# 监控配置
MONITORING_ENABLED=true
MONITORING_DASHBOARD_URL=http://localhost:8080/dashboard
```

### 数据库迁移

项目使用 Supabase 作为数据库，迁移文件位于 `supabase/migrations/`：

- `001_initial_schema.sql` - 基础用户和课程表
- `002_sms_verification.sql` - 短信验证码表
- `003_learning_progress.sql` - 学习进度表
- `add_face_verified_to_users.sql` - 人脸验证字段
- `create_face_auth_tables.sql` - 人脸认证表

## 10. 🛠️ 故障排除

### 常见问题
1. **端口被占用**: 一键启动会自动寻找可用端口
2. **依赖安装失败**: 运行 `npm cache clean --force` 后重试
3. **Supabase连接失败**: 检查环境变量配置是否正确
4. **短信发送失败**: 确认阿里云短信服务配置和余额
5. **人脸识别失败**: 检查百度AI配置和网络连接
6. **权限问题**: Linux/Mac用户需要 `chmod +x start.sh`

### 测试命令
```bash
# 环境检查
npm run check-env

# 运行测试
npm run test
npm run test:e2e

# 检查代码质量
npm run check

# 监控系统状态
npm run monitoring:test
```

### 获取帮助
- 查看 `START_GUIDE.md` 中的详细故障排除部分
- 查看 `docs/` 目录中的相关文档
- 运行相应的测试命令诊断问题

---

**🎉 SkillUp Platform - 功能完整的在线技能学习平台！**
