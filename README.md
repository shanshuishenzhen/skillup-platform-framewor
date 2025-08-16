# SkillUp - 技能提升在线学习平台

欢迎来到 SkillUp 项目！这是一个根据详细的需求文档（RD）和技术文档（TD）搭建的初始网站框架。本项目旨在成为一个面向各行业从业者的技能等级提升在线学习平台。

## 1. 技术栈 (Tech Stack)

本项目基于以下现代技术栈构建，以确保高性能、良好的开发体验和可扩展性：

- **前端**: [React](https://react.dev/) + [Next.js](https://nextjs.org/) (App Router)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **后端 (模拟)**: Next.js API Routes
- **包管理器**: npm

## 2. 如何开始 (Getting Started)

请遵循以下步骤来启动本地开发服务器：

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

## 3. 项目结构导览 (Project Structure)

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
├── tailwind.config.ts    # Tailwind CSS 配置文件
└── next.config.mjs       # Next.js 配置文件
```

- **`src/app`**: 存放所有页面和API路由。页面路由和API路由在这里统一管理。
- **`src/components`**: 存放所有可复用的UI组件。`ui` 目录用于原子组件，`layout` 用于页面结构组件。
- **`src/services`**: 存放核心业务逻辑。每个文件模拟一个微服务，负责处理特定领域的业务，如用户管理或课程管理。这使得未来将项目拆分为真实微服务变得更加容易。
- **`src/lib/db`**: 存放与数据库相关的代码，`schema.ts` 文件是数据库表的“代码形式”定义。

## 4. 已完成的框架功能

此初始框架已包含以下功能骨架：

- ✅ **UI 风格配置**: `tailwind.config.ts` 已配置好品牌色和字体。
- ✅ **核心页面骨架**: 创建了首页、登录页、注册页和课程详情页的基本布局和样式。
- ✅ **可复用组件**: 提供了 `Button`, `Card`, `Input`, `Header`, `Footer` 等基础组件。
- ✅ **后端服务层骨架**: 在 `src/services` 中定义了用户、课程和AI服务的逻辑占位符。
- ✅ **API 接口骨架**: 在 `src/app/api` 中定义了用户认证和课程查询的API端点。
- ✅ **数据库模型定义**: 在 `src/lib/db/schema.ts` 中以TypeScript接口的形式定义了数据表结构。

## 5. 后续开发建议 (Next Steps & TODOs)

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
