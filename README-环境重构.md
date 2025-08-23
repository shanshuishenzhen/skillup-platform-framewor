# SkillUp Platform 环境重构指南

## 📋 概述

本指南为新电脑或环境变更后的 SkillUp Platform 提供完整的环境重构解决方案。包含自动化脚本，可以一键完成环境配置、依赖安装和应用启动。

## 🚀 快速开始

### 方案一：完整环境重构（推荐新电脑使用）

1. **运行环境重构脚本**
   ```bash
   # 右键以管理员身份运行
   setup-environment.bat
   ```
   
   此脚本将自动完成：
   - ✅ 检查并安装 Node.js
   - ✅ 创建项目目录结构
   - ✅ 安装项目依赖
   - ✅ 配置环境变量
   - ✅ 初始化数据库
   - ✅ 创建桌面快捷方式
   - ✅ 运行环境检查

2. **启动应用**
   ```bash
   start.bat
   # 或双击桌面快捷方式
   ```

### 方案二：快速启动（环境已配置）

如果环境已经配置过，可以直接使用快速启动：

```bash
quick-start.bat
```

此脚本将：
- ⚡ 快速环境检查
- ⚡ 自动安装缺失依赖
- ⚡ 清理端口占用
- ⚡ 启动应用服务器
- ⚡ 自动打开浏览器

## 📁 脚本文件说明

### 🔧 setup-environment.bat
**完整环境重构脚本**
- 适用于：新电脑、环境损坏、首次部署
- 功能：全自动环境配置和依赖安装
- 权限：需要管理员权限
- 时间：5-15分钟（取决于网络速度）

### 🚀 start.bat
**标准启动脚本**
- 适用于：日常开发使用
- 功能：环境检查 + 应用启动
- 权限：普通用户权限
- 时间：30秒-2分钟

### ⚡ quick-start.bat
**快速启动脚本**
- 适用于：快速测试、演示
- 功能：最小化检查 + 快速启动 + 自动打开浏览器
- 权限：普通用户权限
- 时间：10-30秒

### 🏥 scripts/environment-doctor.js
**环境诊断工具**
- 适用于：问题排查、环境验证
- 功能：全面环境检查 + 自动修复
- 使用：`node scripts/environment-doctor.js`

## 🔧 环境配置文件

### .env.example
环境变量配置模板，包含所有可配置项的说明。

### .env
实际环境变量配置文件，从 `.env.example` 复制而来，包含默认配置。

**重要配置项：**
```env
# 应用端口
PORT=3000

# 数据库路径
DATABASE_URL=sqlite:./data/skillup.db

# JWT密钥（生产环境请更换）
JWT_SECRET=skillup_platform_jwt_secret_key_2024

# 自动打开浏览器
DEV_AUTO_OPEN_BROWSER=true
```

## 🗂️ 目录结构

重构后的项目目录结构：

```
skillup_platform/
├── 📁 src/                    # 源代码目录
├── 📁 public/                 # 静态资源
├── 📁 scripts/                # 脚本文件
│   ├── 🔧 environment-doctor.js
│   └── 🔍 check-environment.js
├── 📁 data/                   # 数据库文件
│   └── 💾 skillup.db
├── 📁 logs/                   # 日志文件
├── 📁 uploads/                # 上传文件
├── 📁 temp/                   # 临时文件
├── 🚀 setup-environment.bat   # 环境重构脚本
├── 🚀 start.bat              # 标准启动脚本
├── ⚡ quick-start.bat         # 快速启动脚本
├── ⚙️ .env                   # 环境变量配置
├── 📋 .env.example           # 环境变量模板
└── 📖 README-环境重构.md      # 本文档
```

## 🔍 故障排除

### 常见问题及解决方案

#### 1. Node.js 未安装或版本过低
**现象：** 提示 "未找到 Node.js" 或版本不兼容
**解决：** 
```bash
# 运行环境重构脚本（会自动下载安装）
setup-environment.bat

# 或手动下载安装
# 访问：https://nodejs.org/
```

#### 2. 依赖安装失败
**现象：** npm install 报错或超时
**解决：**
```bash
# 清理缓存后重试
npm cache clean --force
npm install

# 或使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

#### 3. 端口被占用
**现象：** 提示端口 3000 已被占用
**解决：**
```bash
# 脚本会自动处理，或手动终止进程
netstat -ano | findstr :3000
taskkill /PID [进程ID] /F
```

#### 4. 数据库初始化失败
**现象：** 数据库文件不存在或损坏
**解决：**
```bash
# 手动初始化数据库
node init-database.js

# 或删除数据库文件重新初始化
del data\skillup.db
node init-database.js
```

#### 5. 权限不足
**现象：** 提示权限被拒绝
**解决：**
- 右键脚本文件，选择"以管理员身份运行"
- 或在管理员命令提示符中运行

### 🏥 使用环境诊断工具

当遇到复杂问题时，可以使用环境诊断工具：

```bash
node scripts/environment-doctor.js
```

该工具会：
- 🔍 全面检查环境配置
- 📊 生成详细诊断报告
- 🔧 提供自动修复选项
- 💡 给出具体解决建议

## 🌐 访问应用

启动成功后，可以通过以下地址访问：

- **本地访问：** http://localhost:3000
- **网络访问：** http://[您的IP地址]:3000

## 📞 技术支持

如果遇到无法解决的问题：

1. 📋 运行环境诊断工具收集信息
2. 📝 查看日志文件 `logs/app.log`
3. 🔍 检查控制台错误信息
4. 📧 联系技术支持团队

## 🔄 更新说明

### v1.0.0 (2024-01-XX)
- ✨ 新增完整环境重构脚本
- ✨ 新增快速启动脚本
- ✨ 新增环境诊断工具
- ✨ 新增自动浏览器打开功能
- ✨ 新增桌面快捷方式创建
- ✨ 优化错误处理和用户提示
- ✨ 支持 Windows 批处理脚本

---

**🎉 祝您使用愉快！**

如有任何问题或建议，欢迎反馈。