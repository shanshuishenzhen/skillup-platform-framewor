# SkillUp Platform - 一键启动指南

## 🚀 快速开始

SkillUp Platform 提供了完善的一键启动功能，让您能够快速启动整个在线学习平台。

### 系统要求

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **内存**: 至少 4GB RAM
- **磁盘空间**: 至少 2GB 可用空间

### 启动方式

#### 方式一：使用启动脚本（推荐）

**Windows 用户:**
```bash
# 双击运行或在命令行中执行
start.bat
```

**Linux/Mac 用户:**
```bash
# 添加执行权限并运行
chmod +x start.sh
./start.sh
```

#### 方式二：直接使用 Node.js

```bash
node start.js
```

#### 方式三：使用 npm 脚本

```bash
npm run dev
```

## 🔧 配置说明

### 启动配置文件 (start-config.json)

您可以通过修改 `start-config.json` 文件来自定义启动行为：

```json
{
  "app": {
    "name": "SkillUp Platform",
    "version": "1.0.0",
    "description": "智能在线学习平台"
  },
  "server": {
    "defaultPort": 3000,
    "host": "localhost",
    "autoOpenBrowser": true,
    "startupTimeout": 30000
  },
  "database": {
    "type": "sqlite",
    "path": "./data/skillup.db",
    "autoInit": true,
    "seedData": true
  },
  "environment": {
    "NODE_ENV": "development",
    "NEXT_TELEMETRY_DISABLED": "1"
  }
}
```

### 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `server.defaultPort` | 默认端口号 | 3000 |
| `server.host` | 主机地址 | localhost |
| `server.autoOpenBrowser` | 是否自动打开浏览器 | true |
| `database.autoInit` | 是否自动初始化数据库 | true |
| `database.seedData` | 是否插入示例数据 | true |

## 🗄️ 数据库说明

### 自动初始化

启动脚本会自动：
1. 创建 SQLite 数据库文件
2. 创建必要的数据表
3. 插入示例数据（如果启用）

### 数据表结构

- **users**: 用户信息表
- **courses**: 课程信息表
- **enrollments**: 选课记录表
- **exams**: 考试信息表
- **questions**: 题目信息表
- **exam_attempts**: 考试记录表

### 示例数据

系统会自动创建以下示例账户：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 系统管理员 |
| teacher1 | teacher123 | 教师 | 金融学院教师 |
| teacher2 | teacher123 | 教师 | 医学院教师 |
| student1 | student123 | 学生 | 计算机系学生 |
| student2 | student123 | 学生 | 金融系学生 |

## 🔍 启动流程

启动脚本会按以下顺序执行：

1. **环境检查**
   - 检查 Node.js 和 npm 版本
   - 验证必需文件存在
   - 检查依赖包完整性

2. **依赖安装**
   - 自动安装缺失的依赖包
   - 更新 package-lock.json

3. **数据库初始化**
   - 创建数据库文件
   - 建立数据表结构
   - 插入示例数据

4. **服务器启动**
   - 查找可用端口
   - 启动 Next.js 开发服务器
   - 自动打开浏览器

## 🌐 访问地址

启动成功后，您可以通过以下地址访问：

- **本地访问**: http://localhost:3000
- **网络访问**: http://[您的IP地址]:3000

## 🛠️ 故障排除

### 常见问题

**1. 端口被占用**
```
解决方案：脚本会自动寻找可用端口（3001, 3002...）
```

**2. 依赖安装失败**
```bash
# 清除缓存后重试
npm cache clean --force
npm install
```

**3. 数据库初始化失败**
```bash
# 删除数据库文件后重试
rm -rf data/
node start.js
```

**4. 权限问题（Linux/Mac）**
```bash
# 添加执行权限
chmod +x start.sh
chmod +x start.js
```

### 日志查看

启动过程中的详细日志会显示在控制台中，包括：
- 环境检查结果
- 依赖安装进度
- 数据库初始化状态
- 服务器启动信息

## 📝 开发模式

启动后，系统运行在开发模式下，具有以下特性：

- **热重载**: 代码修改后自动刷新
- **详细日志**: 显示详细的调试信息
- **开发工具**: 支持 React DevTools
- **TypeScript**: 实时类型检查

## 🔒 生产部署

如需部署到生产环境，请使用：

```bash
npm run build
npm start
```

## 📞 技术支持

如遇到问题，请：

1. 查看控制台错误信息
2. 检查 `START_GUIDE.md` 故障排除部分
3. 提交 Issue 到项目仓库

---

**祝您使用愉快！** 🎉
