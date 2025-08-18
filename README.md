# SkillUp - 技能提升在线学习平台

欢迎来到 SkillUp 项目！这是一个根据详细的需求文档（RD）和技术文档（TD）搭建的初始网站框架。本项目旨在成为一个面向各行业从业者的技能等级提升在线学习平台。

## 1. 技术栈 (Tech Stack)

本项目基于以下现代技术栈构建，以确保高性能、良好的开发体验和可扩展性：

- **前端**: [React](https://react.dev/) + [Next.js](https://nextjs.org/) (App Router)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **后端 (模拟)**: Next.js API Routes
- **包管理器**: npm

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

## 6. 已完成的框架功能

此初始框架已包含以下功能骨架：

### 基础框架
- ✅ **UI 风格配置**: `tailwind.config.ts` 已配置好品牌色和字体。
- ✅ **核心页面骨架**: 创建了首页、登录页、注册页和课程详情页的基本布局和样式。
- ✅ **可复用组件**: 提供了 `Button`, `Card`, `Input`, `Header`, `Footer` 等基础组件。
- ✅ **后端服务层骨架**: 在 `src/services` 中定义了用户、课程和AI服务的逻辑占位符。
- ✅ **API 接口骨架**: 在 `src/app/api` 中定义了用户认证和课程查询的API端点。
- ✅ **数据库模型定义**: 在 `src/lib/db/schema.ts` 中以TypeScript接口的形式定义了数据表结构。

### 🆕 一键启动功能
- ✅ **智能启动脚本**: 自动检查环境、安装依赖、初始化数据库
- ✅ **跨平台支持**: 提供Windows批处理和Linux/Mac Shell脚本
- ✅ **数据库自动化**: SQLite数据库自动创建和示例数据插入
- ✅ **环境检查工具**: 全面的环境兼容性检查
- ✅ **配置管理**: 灵活的启动配置和更新工具
- ✅ **错误处理**: 完善的错误提示和故障排除
- ✅ **测试工具**: 启动功能完整性测试
- ✅ **详细文档**: 完整的使用指南和功能说明

## 7. 后续开发建议 (Next Steps & TODOs)

这个框架为项目打下了坚实的基础。以下是将它发展为完整应用需要完成的关键任务：

- **数据库集成**:
  - [ ] 选择一个ORM（如 [Prisma](https://www.prisma.io/)）并根据 `schema.ts` 创建真实的数据库迁移。
  - [ ] 将 `services` 目录中的所有模拟函数替换为真实的数据库查询。

- **认证与安全**:
  - [ ] 在 `userService` 中使用 `bcrypt` 对密码进行哈希处理。
  - [ ] 实现 [JWT (JSON Web Tokens)](https://jwt.io/) 的生成和验证流程，以保护API路由。

- **第三方服务对接**:
  - [ ] **短信服务**: 对接阿里云等短信服务，实现真实的手机验证码功能。
  - [ ] **人脸识别**: 对接百度AI等服务，在付费用户登录时实现刷脸二次认证。
  - [ ] **视频服务**: 对接阿里云OSS和视频点播服务，实现视频的上传、转码、加密和播放。
  - [ ] **支付服务**: 对接微信支付或支付宝，处理课程购买流程。
  - [ ] **AI 内容生成**: 对接 OpenAI 或其他大模型 API，实现 `aiService` 中课程内容的自动生成。

- **功能完善**:
  - [ ] 开发管理员后台，用于用户管理、课程上架、内容审核和数据统计。
  - [ ] 完善学习记录功能，如视频播放进度跟踪。
  - [ ] 为所有功能编写单元测试和集成测试。

## 8. 📚 相关文档

- **[START_GUIDE.md](./START_GUIDE.md)** - 详细的一键启动使用指南
- **[STARTUP_FEATURES.md](./STARTUP_FEATURES.md)** - 一键启动功能完整说明
- **配置文件**: `start-config.json` - 启动行为配置
- **测试工具**: `test-startup.js` - 验证启动功能完整性

## 9. 🛠️ 故障排除

### 常见问题
1. **端口被占用**: 一键启动会自动寻找可用端口
2. **依赖安装失败**: 运行 `npm cache clean --force` 后重试
3. **数据库初始化失败**: 删除 `data/` 目录后重新启动
4. **权限问题**: Linux/Mac用户需要 `chmod +x start.sh`

### 获取帮助
- 查看 `START_GUIDE.md` 中的详细故障排除部分
- 运行 `node test-startup.js` 检查启动功能状态
- 运行 `npm run check-env` 诊断环境问题

---

**🎉 现在您可以使用一键启动功能快速开始使用 SkillUp Platform！**
