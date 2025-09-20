# 小型初创公司OA办公系统

专为小型初创公司设计的轻量级OA办公自动化系统，提供团队沟通、项目管理和文件共享等核心功能。

## 🚀 功能特性

### ✅ 已完成功能

#### 🔐 用户认证系统
- 用户注册/登录/注销
- JWT令牌认证
- 用户信息管理
- 安全的密码加密

#### 📋 项目管理系统
- 项目创建、查看、编辑、删除 (完整CRUD)
- 项目详情页面
- 项目成员管理
- 项目状态跟踪

#### 📁 文件管理系统 (新增)
- 文件上传/下载
- 支持多种文件格式 (图片、文档、音视频等)
- 文件分类管理
- 文件权限控制
- 文件预览功能
- 拖拽上传支持

#### 💬 即时通讯系统 (新增)
- 实时消息发送/接收
- 一对一私聊
- 群组聊天
- 文件传输
- 消息已读状态
- 在线状态显示
- 正在输入指示器
- 消息反应 (表情回应)
- 消息搜索功能

#### 📝 任务管理
- 任务模型定义
- 基础任务操作

### Incomplete Features (Blocked by Environment Issue)

*   **Real-time Chat**: This feature was planned to allow one-on-one real-time messaging between users.
*   **Project File Management**: This feature was planned to allow users to upload and manage files associated with a specific project.

**Reason for Incompletion:** The development of these features was blocked by a persistent and unresolvable environment error (`ENOENT: no such file or directory, uv_cwd`) that occurred when trying to install new backend dependencies (`socket.io`, `multer`) using `npm`. Multiple workarounds were attempted without success. In a standard Node.js environment, these dependencies should install correctly.

### 🔄 计划中功能
- 项目进度可视化 (甘特图/看板)
- 高级任务管理
- 通知推送系统
- 移动端适配
- 数据统计报表

## 🛠️ 技术栈

### 后端技术
- **运行环境**: Node.js 16+
- **Web框架**: Express.js
- **数据库**: MongoDB + Mongoose ODM
- **实时通讯**: Socket.io
- **文件处理**: Multer
- **认证**: JWT + bcryptjs
- **API文档**: 自动生成的RESTful API

### 前端技术
- **框架**: React 18+
- **路由**: React Router DOM
- **HTTP客户端**: Axios
- **实时通讯**: Socket.io-client
- **状态管理**: React Context API
- **UI组件**: 自定义组件 + CSS3

### 开发工具
- **版本控制**: Git
- **包管理**: npm
- **开发服务器**: nodemon (后端) + React Scripts (前端)

## 📦 项目结构

```
oa-system/
├── 📁 client/                    # 前端React应用
│   ├── 📁 src/
│   │   ├── 📁 components/        # React组件
│   │   │   ├── 📁 auth/          # 认证相关组件
│   │   │   ├── 📁 chat/          # 聊天功能组件
│   │   │   ├── 📁 files/         # 文件管理组件
│   │   │   ├── 📁 projects/      # 项目管理组件
│   │   │   └── 📁 dashboard/     # 仪表板组件
│   │   ├── 📁 context/           # React Context状态管理
│   │   └── 📁 utils/             # 工具函数
│   └── 📄 package.json
├── 📁 models/                    # 数据模型
│   ├── 📄 User.js               # 用户模型
│   ├── 📄 Project.js            # 项目模型
│   ├── 📄 Task.js               # 任务模型
│   ├── 📄 File.js               # 文件模型 (新增)
│   ├── 📄 Message.js            # 消息模型 (新增)
│   └── 📄 ChatRoom.js           # 聊天室模型 (新增)
├── 📁 routes/                    # API路由
│   ├── 📄 auth.js               # 认证路由
│   ├── 📄 projects.js           # 项目路由
│   ├── 📄 tasks.js              # 任务路由
│   ├── 📄 files.js              # 文件路由 (新增)
│   └── 📄 messages.js           # 消息路由 (新增)
├── 📁 middleware/                # 中间件
│   ├── 📄 auth.js               # 认证中间件
│   └── 📄 upload.js             # 文件上传中间件 (新增)
├── 📁 socket/                    # Socket.io处理器 (新增)
│   └── 📄 socketHandlers.js     # 实时通讯处理
├── 📁 uploads/                   # 文件存储目录 (新增)
├── 📁 docs/                      # 项目文档
└── 📄 server.js                 # 服务器入口文件
```

## 🚀 快速开始

### 🎯 一键启动 (推荐)

我们提供了一键启动程序，自动检查环境、安装依赖并启动系统：

#### Windows用户
```cmd
# 双击运行或命令行执行
start_oa.bat
```

#### Linux/Mac用户
```bash
# 运行启动脚本
./start_oa.sh
```

#### 通用方法
```bash
# 使用Python启动脚本
python start_oa_system.py
```

### 📋 环境要求
- **Python** 3.7+ (运行启动脚本)
- **Node.js** 16.0+ (自动检查和提示)
- **MongoDB** 4.4+ (可使用Docker自动启动)
- **npm** 8.0+ (随Node.js安装)

### 🔧 手动安装步骤

如果需要手动安装，请按以下步骤：

1. **环境初始化**
```bash
# 初始化项目环境
python setup_environment.py
```

2. **安装后端依赖**
```bash
npm install
```

3. **安装前端依赖**
```bash
cd client
npm install
cd ..
```

4. **启动MongoDB服务**
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod

# 或使用Docker
docker run -d --name mongodb -p 27017:27017 mongo:5.0
```

### 🎮 运行应用

#### 自动启动 (推荐)
```bash
# 一键启动所有服务
python start_oa_system.py
```

启动脚本会自动：
- ✅ 检查环境依赖
- ✅ 安装缺失的包
- ✅ 启动MongoDB
- ✅ 启动后端服务 (http://localhost:5000)
- ✅ 启动前端服务 (http://localhost:3000)
- ✅ 打开默认浏览器

#### 手动启动
1. **启动后端服务器**
```bash
# 开发模式 (推荐)
npm run dev

# 或生产模式
npm start
```

2. **启动前端开发服务器** (新终端窗口)
```bash
cd client
npm start
```

3. **访问应用**
- 前端界面: http://localhost:3000
- 后端API: http://localhost:5000/api
- 健康检查: http://localhost:5000/api/health

## 🎯 使用指南

### 首次使用
1. 注册新用户账号
2. 登录系统
3. 创建第一个项目
4. 邀请团队成员
5. 开始使用聊天和文件共享功能

### 核心功能使用

#### 📋 项目管理
- 在仪表板点击"创建项目"
- 填写项目信息并保存
- 在项目详情页管理任务和文件

#### 💬 即时通讯
- 点击聊天图标打开聊天窗口
- 选择联系人开始私聊
- 创建群组进行团队讨论
- 支持发送文件和图片

#### 📁 文件管理
- 在项目页面上传文件
- 拖拽文件到上传区域
- 设置文件权限和分类
- 在聊天中分享文件

## 🔧 开发指南

### API接口

#### 认证接口
```
POST /api/auth/register    # 用户注册
POST /api/auth/login       # 用户登录
GET  /api/auth             # 获取当前用户信息
```

#### 项目管理接口
```
GET    /api/projects       # 获取项目列表
POST   /api/projects       # 创建项目
GET    /api/projects/:id   # 获取项目详情
PUT    /api/projects/:id   # 更新项目
DELETE /api/projects/:id   # 删除项目
```

#### 文件管理接口
```
POST   /api/files/upload           # 上传文件
GET    /api/files                  # 获取文件列表
GET    /api/files/:id              # 获取文件详情
GET    /api/files/download/:id     # 下载文件
PUT    /api/files/:id              # 更新文件信息
DELETE /api/files/:id              # 删除文件
```

#### 消息接口
```
GET    /api/messages/rooms         # 获取聊天室列表
POST   /api/messages/rooms         # 创建聊天室
GET    /api/messages/rooms/:id/messages  # 获取消息历史
POST   /api/messages               # 发送消息
```

### Socket.io事件

#### 客户端发送事件
```javascript
socket.emit('join_room', { roomId });
socket.emit('send_message', { roomId, content, messageType });
socket.emit('typing', { roomId });
socket.emit('mark_read', { messageId, roomId });
```

#### 服务器发送事件
```javascript
socket.on('new_message', (data) => { /* 新消息 */ });
socket.on('user_typing', (data) => { /* 用户正在输入 */ });
socket.on('user_online', (data) => { /* 用户上线 */ });
socket.on('message_read', (data) => { /* 消息已读 */ });
```
