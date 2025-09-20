#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统环境配置脚本
用于初始化和配置开发环境
"""

import os
import sys
import subprocess
import platform
import json
from pathlib import Path

class EnvironmentSetup:
    def __init__(self):
        self.system = platform.system()
        self.project_root = Path(__file__).parent
        
    def print_step(self, message):
        print(f"🔧 {message}")
    
    def print_success(self, message):
        print(f"✅ {message}")
    
    def print_error(self, message):
        print(f"❌ {message}")
    
    def print_warning(self, message):
        print(f"⚠️ {message}")

    def run_command(self, command, cwd=None):
        """执行命令并返回结果"""
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=300
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Command timeout"
        except Exception as e:
            return False, "", str(e)

    def create_package_json(self):
        """创建package.json文件"""
        package_json_path = self.project_root / 'package.json'
        
        if package_json_path.exists():
            self.print_success("package.json已存在")
            return True
        
        self.print_step("创建package.json...")
        
        package_content = {
            "name": "oa-system",
            "version": "1.0.0",
            "description": "小型初创公司OA办公系统",
            "main": "server.js",
            "scripts": {
                "start": "node server.js",
                "dev": "nodemon server.js",
                "test": "echo \"Error: no test specified\" && exit 1"
            },
            "keywords": ["oa", "office", "management", "nodejs", "express"],
            "author": "OA System Team",
            "license": "MIT",
            "dependencies": {
                "express": "^4.18.2",
                "mongoose": "^7.5.0",
                "bcryptjs": "^2.4.3",
                "jsonwebtoken": "^9.0.2",
                "cors": "^2.8.5",
                "dotenv": "^16.3.1",
                "multer": "^1.4.5-lts.1",
                "socket.io": "^4.7.2",
                "helmet": "^7.0.0",
                "express-rate-limit": "^6.10.0",
                "compression": "^1.7.4"
            },
            "devDependencies": {
                "nodemon": "^3.0.1"
            },
            "engines": {
                "node": ">=16.0.0",
                "npm": ">=8.0.0"
            }
        }
        
        try:
            with open(package_json_path, 'w', encoding='utf-8') as f:
                json.dump(package_content, f, indent=2, ensure_ascii=False)
            self.print_success("package.json创建成功")
            return True
        except Exception as e:
            self.print_error(f"创建package.json失败: {e}")
            return False

    def create_client_package_json(self):
        """创建前端package.json文件"""
        client_dir = self.project_root / 'client'
        client_dir.mkdir(exist_ok=True)
        
        package_json_path = client_dir / 'package.json'
        
        if package_json_path.exists():
            self.print_success("前端package.json已存在")
            return True
        
        self.print_step("创建前端package.json...")
        
        package_content = {
            "name": "oa-system-client",
            "version": "1.0.0",
            "description": "OA系统前端应用",
            "private": True,
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "react-router-dom": "^6.15.0",
                "axios": "^1.5.0",
                "socket.io-client": "^4.7.2"
            },
            "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build",
                "test": "react-scripts test",
                "eject": "react-scripts eject"
            },
            "devDependencies": {
                "react-scripts": "^5.0.1"
            },
            "browserslist": {
                "production": [
                    ">0.2%",
                    "not dead",
                    "not op_mini all"
                ],
                "development": [
                    "last 1 chrome version",
                    "last 1 firefox version",
                    "last 1 safari version"
                ]
            },
            "proxy": "http://localhost:5000"
        }
        
        try:
            with open(package_json_path, 'w', encoding='utf-8') as f:
                json.dump(package_content, f, indent=2, ensure_ascii=False)
            self.print_success("前端package.json创建成功")
            return True
        except Exception as e:
            self.print_error(f"创建前端package.json失败: {e}")
            return False

    def create_server_js(self):
        """创建基础的server.js文件"""
        server_js_path = self.project_root / 'server.js'
        
        if server_js_path.exists():
            self.print_success("server.js已存在")
            return True
        
        self.print_step("创建server.js...")
        
        server_content = '''const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'uploads')));

// 数据库连接
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simple-oa';
mongoose.connect(dbURI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('MongoDB连接成功'))
.catch(err => console.log('MongoDB连接错误:', err));

// 基础路由
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'OA系统运行正常',
        timestamp: new Date().toISOString()
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});
'''
        
        try:
            with open(server_js_path, 'w', encoding='utf-8') as f:
                f.write(server_content)
            self.print_success("server.js创建成功")
            return True
        except Exception as e:
            self.print_error(f"创建server.js失败: {e}")
            return False

    def create_env_file(self):
        """创建环境变量文件"""
        env_path = self.project_root / '.env'
        
        if env_path.exists():
            self.print_success(".env文件已存在")
            return True
        
        self.print_step("创建.env文件...")
        
        env_content = '''# 环境配置
NODE_ENV=development

# 服务器配置
PORT=5000

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/simple-oa

# JWT配置
JWT_SECRET=your_jwt_secret_key_change_in_production

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Socket.io配置
SOCKET_CORS_ORIGIN=http://localhost:3000
'''
        
        try:
            with open(env_path, 'w', encoding='utf-8') as f:
                f.write(env_content)
            self.print_success(".env文件创建成功")
            return True
        except Exception as e:
            self.print_error(f"创建.env文件失败: {e}")
            return False

    def create_directories(self):
        """创建必要的目录"""
        directories = [
            'uploads',
            'uploads/documents',
            'uploads/images',
            'uploads/videos',
            'uploads/audio',
            'uploads/archives',
            'uploads/others',
            'models',
            'routes',
            'middleware',
            'socket',
            'client/src',
            'client/public',
            'docs'
        ]
        
        self.print_step("创建项目目录结构...")
        
        for directory in directories:
            dir_path = self.project_root / directory
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                self.print_error(f"创建目录 {directory} 失败: {e}")
                return False
        
        self.print_success("目录结构创建完成")
        return True

    def create_gitignore(self):
        """创建.gitignore文件"""
        gitignore_path = self.project_root / '.gitignore'
        
        if gitignore_path.exists():
            self.print_success(".gitignore已存在")
            return True
        
        self.print_step("创建.gitignore...")
        
        gitignore_content = '''# 依赖
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 上传文件
uploads/*
!uploads/.gitkeep

# 日志
logs
*.log

# 运行时数据
pids
*.pid
*.seed
*.pid.lock

# 覆盖率目录
coverage/

# 构建输出
build/
dist/

# IDE
.vscode/
.idea/
*.swp
*.swo

# 操作系统
.DS_Store
Thumbs.db

# 临时文件
*.tmp
*.temp

# 数据库
*.db
*.sqlite
'''
        
        try:
            with open(gitignore_path, 'w', encoding='utf-8') as f:
                f.write(gitignore_content)
            self.print_success(".gitignore创建成功")
            return True
        except Exception as e:
            self.print_error(f"创建.gitignore失败: {e}")
            return False

    def install_global_dependencies(self):
        """安装全局依赖"""
        self.print_step("检查全局依赖...")
        
        global_packages = ['nodemon']
        
        for package in global_packages:
            success, output, error = self.run_command(f'npm list -g {package}')
            if not success:
                self.print_step(f"安装全局包: {package}")
                success, output, error = self.run_command(f'npm install -g {package}')
                if success:
                    self.print_success(f"{package} 安装成功")
                else:
                    self.print_warning(f"{package} 安装失败，将使用本地版本")
        
        return True

    def setup(self):
        """执行完整的环境配置"""
        print("🏢 OA系统环境配置")
        print("=" * 50)
        
        steps = [
            ("创建项目目录", self.create_directories),
            ("创建package.json", self.create_package_json),
            ("创建前端package.json", self.create_client_package_json),
            ("创建server.js", self.create_server_js),
            ("创建环境配置", self.create_env_file),
            ("创建.gitignore", self.create_gitignore),
            ("安装全局依赖", self.install_global_dependencies)
        ]
        
        for step_name, step_func in steps:
            print(f"\n📋 {step_name}...")
            try:
                if not step_func():
                    self.print_error(f"{step_name}失败")
                    return False
            except Exception as e:
                self.print_error(f"{step_name}出错: {e}")
                return False
        
        print("\n" + "=" * 50)
        self.print_success("环境配置完成！")
        print("\n下一步:")
        print("1. 运行 'python start_oa_system.py' 启动系统")
        print("2. 或者运行 'start_oa.bat' (Windows) / './start_oa.sh' (Linux/Mac)")
        print("3. 访问 http://localhost:3000 使用系统")
        
        return True

def main():
    setup = EnvironmentSetup()
    success = setup.setup()
    
    if not success:
        print("\n❌ 环境配置失败")
        sys.exit(1)

if __name__ == "__main__":
    main()
