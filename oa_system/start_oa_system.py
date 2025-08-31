#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统一键启动程序
自动检查环境、安装依赖并启动系统
"""

import os
import sys
import subprocess
import time
import webbrowser
import json
import platform
import shutil
from pathlib import Path
import threading
import signal

class Colors:
    """控制台颜色"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class OASystemLauncher:
    def __init__(self):
        self.system = platform.system()
        self.project_root = Path(__file__).parent
        self.backend_process = None
        self.frontend_process = None
        self.mongodb_process = None
        
        # 配置信息
        self.config = {
            'backend_port': 5000,
            'frontend_port': 3000,
            'mongodb_port': 27017,
            'frontend_url': 'http://localhost:3000',
            'backend_url': 'http://localhost:5000'
        }
        
        print(f"{Colors.HEADER}{'='*60}")
        print(f"🏢 OA办公系统一键启动程序")
        print(f"{'='*60}{Colors.ENDC}")

    def print_status(self, message, status="INFO"):
        """打印状态信息"""
        color_map = {
            "INFO": Colors.OKBLUE,
            "SUCCESS": Colors.OKGREEN,
            "WARNING": Colors.WARNING,
            "ERROR": Colors.FAIL
        }
        color = color_map.get(status, Colors.OKBLUE)
        icon_map = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌"
        }
        icon = icon_map.get(status, "ℹ️")
        print(f"{color}{icon} {message}{Colors.ENDC}")

    def check_command_exists(self, command):
        """检查命令是否存在"""
        return shutil.which(command) is not None

    def run_command(self, command, cwd=None, shell=True, capture_output=True):
        """执行命令"""
        try:
            if capture_output:
                result = subprocess.run(
                    command, 
                    shell=shell, 
                    cwd=cwd, 
                    capture_output=True, 
                    text=True,
                    timeout=300
                )
                return result.returncode == 0, result.stdout, result.stderr
            else:
                process = subprocess.Popen(
                    command,
                    shell=shell,
                    cwd=cwd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                return process
        except subprocess.TimeoutExpired:
            self.print_status("命令执行超时", "ERROR")
            return False, "", "Timeout"
        except Exception as e:
            self.print_status(f"命令执行失败: {e}", "ERROR")
            return False, "", str(e)

    def check_node_version(self):
        """检查Node.js版本"""
        self.print_status("检查Node.js环境...")
        
        if not self.check_command_exists('node'):
            self.print_status("Node.js未安装", "ERROR")
            self.print_status("请访问 https://nodejs.org 下载安装Node.js 16+", "WARNING")
            return False
            
        success, output, _ = self.run_command('node --version')
        if success:
            version = output.strip()
            self.print_status(f"Node.js版本: {version}", "SUCCESS")
            
            # 检查版本是否满足要求 (v16+)
            version_num = int(version.replace('v', '').split('.')[0])
            if version_num < 16:
                self.print_status("Node.js版本过低，需要v16+", "WARNING")
                return False
            return True
        return False

    def check_npm_version(self):
        """检查npm版本"""
        if not self.check_command_exists('npm'):
            self.print_status("npm未安装", "ERROR")
            return False
            
        success, output, _ = self.run_command('npm --version')
        if success:
            version = output.strip()
            self.print_status(f"npm版本: {version}", "SUCCESS")
            return True
        return False

    def check_mongodb(self):
        """检查MongoDB"""
        self.print_status("检查MongoDB环境...")
        
        # 检查MongoDB是否安装
        mongodb_commands = ['mongod', 'mongo', 'mongosh']
        mongodb_found = any(self.check_command_exists(cmd) for cmd in mongodb_commands)
        
        if not mongodb_found:
            self.print_status("MongoDB未找到，尝试启动Docker MongoDB...", "WARNING")
            return self.start_mongodb_docker()
        
        # 检查MongoDB是否运行
        if self.is_port_in_use(self.config['mongodb_port']):
            self.print_status("MongoDB已在运行", "SUCCESS")
            return True
        else:
            return self.start_mongodb()

    def start_mongodb_docker(self):
        """使用Docker启动MongoDB"""
        if not self.check_command_exists('docker'):
            self.print_status("Docker未安装，请手动安装MongoDB", "ERROR")
            self.print_status("下载地址: https://www.mongodb.com/try/download/community", "INFO")
            return False
        
        self.print_status("使用Docker启动MongoDB...")
        
        # 检查是否已有MongoDB容器
        success, output, _ = self.run_command('docker ps -a --filter name=oa-mongodb --format "{{.Names}}"')
        if success and 'oa-mongodb' in output:
            # 启动已存在的容器
            self.run_command('docker start oa-mongodb')
        else:
            # 创建新容器
            docker_cmd = (
                'docker run -d --name oa-mongodb '
                f'-p {self.config["mongodb_port"]}:27017 '
                '-v oa-mongodb-data:/data/db '
                'mongo:5.0'
            )
            success, _, error = self.run_command(docker_cmd)
            if not success:
                self.print_status(f"Docker启动MongoDB失败: {error}", "ERROR")
                return False
        
        # 等待MongoDB启动
        self.print_status("等待MongoDB启动...")
        for i in range(30):
            if self.is_port_in_use(self.config['mongodb_port']):
                self.print_status("MongoDB启动成功", "SUCCESS")
                return True
            time.sleep(1)
        
        self.print_status("MongoDB启动超时", "ERROR")
        return False

    def start_mongodb(self):
        """启动本地MongoDB"""
        self.print_status("启动MongoDB服务...")
        
        if self.system == "Windows":
            # Windows系统
            commands = [
                'net start MongoDB',
                'sc start MongoDB',
                'mongod --dbpath ./data/db'
            ]
        else:
            # Linux/Mac系统
            commands = [
                'sudo systemctl start mongod',
                'sudo service mongod start',
                'brew services start mongodb-community',
                'mongod --dbpath ./data/db'
            ]
        
        for cmd in commands:
            try:
                success, _, _ = self.run_command(cmd)
                if success:
                    time.sleep(3)
                    if self.is_port_in_use(self.config['mongodb_port']):
                        self.print_status("MongoDB启动成功", "SUCCESS")
                        return True
            except:
                continue
        
        self.print_status("MongoDB启动失败，请手动启动", "ERROR")
        return False

    def is_port_in_use(self, port):
        """检查端口是否被占用"""
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.connect(('localhost', port))
                return True
            except:
                return False

    def install_backend_dependencies(self):
        """安装后端依赖"""
        self.print_status("检查后端依赖...")
        
        package_json = self.project_root / 'package.json'
        if not package_json.exists():
            self.print_status("package.json不存在", "ERROR")
            return False
        
        node_modules = self.project_root / 'node_modules'
        if not node_modules.exists():
            self.print_status("安装后端依赖...")
            success, output, error = self.run_command('npm install', cwd=self.project_root)
            if not success:
                self.print_status(f"后端依赖安装失败: {error}", "ERROR")
                return False
            self.print_status("后端依赖安装完成", "SUCCESS")
        else:
            self.print_status("后端依赖已存在", "SUCCESS")
        
        return True

    def install_frontend_dependencies(self):
        """安装前端依赖"""
        self.print_status("检查前端依赖...")
        
        client_dir = self.project_root / 'client'
        if not client_dir.exists():
            self.print_status("client目录不存在", "ERROR")
            return False
        
        package_json = client_dir / 'package.json'
        if not package_json.exists():
            self.print_status("前端package.json不存在", "ERROR")
            return False
        
        node_modules = client_dir / 'node_modules'
        if not node_modules.exists():
            self.print_status("安装前端依赖...")
            success, output, error = self.run_command('npm install', cwd=client_dir)
            if not success:
                self.print_status(f"前端依赖安装失败: {error}", "ERROR")
                return False
            self.print_status("前端依赖安装完成", "SUCCESS")
        else:
            self.print_status("前端依赖已存在", "SUCCESS")
        
        return True

    def create_env_file(self):
        """创建环境配置文件"""
        env_file = self.project_root / '.env'
        if not env_file.exists():
            self.print_status("创建环境配置文件...")
            env_content = f"""NODE_ENV=development
PORT={self.config['backend_port']}
MONGODB_URI=mongodb://localhost:{self.config['mongodb_port']}/simple-oa
JWT_SECRET=your_jwt_secret_key_change_in_production
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
"""
            with open(env_file, 'w', encoding='utf-8') as f:
                f.write(env_content)
            self.print_status("环境配置文件创建完成", "SUCCESS")

    def create_uploads_directory(self):
        """创建上传目录"""
        uploads_dir = self.project_root / 'uploads'
        if not uploads_dir.exists():
            uploads_dir.mkdir(parents=True, exist_ok=True)
            self.print_status("创建uploads目录", "SUCCESS")

    def start_backend(self):
        """启动后端服务"""
        self.print_status("启动后端服务...")
        
        if self.is_port_in_use(self.config['backend_port']):
            self.print_status(f"端口{self.config['backend_port']}已被占用", "WARNING")
            return False
        
        # 使用npm run dev启动
        self.backend_process = self.run_command(
            'npm run dev', 
            cwd=self.project_root, 
            capture_output=False
        )
        
        # 等待后端启动
        self.print_status("等待后端服务启动...")
        for i in range(30):
            if self.is_port_in_use(self.config['backend_port']):
                self.print_status("后端服务启动成功", "SUCCESS")
                return True
            time.sleep(1)
        
        self.print_status("后端服务启动超时", "ERROR")
        return False

    def start_frontend(self):
        """启动前端服务"""
        self.print_status("启动前端服务...")
        
        if self.is_port_in_use(self.config['frontend_port']):
            self.print_status(f"端口{self.config['frontend_port']}已被占用", "WARNING")
            return False
        
        client_dir = self.project_root / 'client'
        
        # 设置环境变量避免自动打开浏览器
        env = os.environ.copy()
        env['BROWSER'] = 'none'
        
        self.frontend_process = subprocess.Popen(
            'npm start',
            shell=True,
            cwd=client_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 等待前端启动
        self.print_status("等待前端服务启动...")
        for i in range(60):  # 前端启动较慢，等待更长时间
            if self.is_port_in_use(self.config['frontend_port']):
                self.print_status("前端服务启动成功", "SUCCESS")
                return True
            time.sleep(1)
        
        self.print_status("前端服务启动超时", "ERROR")
        return False

    def open_browser(self):
        """打开默认浏览器"""
        self.print_status("打开默认浏览器...")
        try:
            webbrowser.open(self.config['frontend_url'])
            self.print_status(f"浏览器已打开: {self.config['frontend_url']}", "SUCCESS")
        except Exception as e:
            self.print_status(f"打开浏览器失败: {e}", "ERROR")
            self.print_status(f"请手动访问: {self.config['frontend_url']}", "INFO")

    def cleanup(self):
        """清理进程"""
        self.print_status("正在关闭服务...")
        
        processes = [
            ("后端服务", self.backend_process),
            ("前端服务", self.frontend_process)
        ]
        
        for name, process in processes:
            if process:
                try:
                    process.terminate()
                    process.wait(timeout=5)
                    self.print_status(f"{name}已关闭", "SUCCESS")
                except subprocess.TimeoutExpired:
                    process.kill()
                    self.print_status(f"{name}强制关闭", "WARNING")
                except Exception as e:
                    self.print_status(f"关闭{name}失败: {e}", "ERROR")

    def signal_handler(self, signum, frame):
        """信号处理器"""
        self.print_status("\n收到退出信号，正在清理...")
        self.cleanup()
        sys.exit(0)

    def run(self):
        """主运行函数"""
        try:
            # 注册信号处理器
            signal.signal(signal.SIGINT, self.signal_handler)
            signal.signal(signal.SIGTERM, self.signal_handler)
            
            # 1. 检查基础环境
            if not self.check_node_version():
                return False
            
            if not self.check_npm_version():
                return False
            
            # 2. 检查和启动MongoDB
            if not self.check_mongodb():
                return False
            
            # 3. 创建必要的文件和目录
            self.create_env_file()
            self.create_uploads_directory()
            
            # 4. 安装依赖
            if not self.install_backend_dependencies():
                return False
            
            if not self.install_frontend_dependencies():
                return False
            
            # 5. 启动服务
            if not self.start_backend():
                return False
            
            time.sleep(3)  # 等待后端完全启动
            
            if not self.start_frontend():
                return False
            
            time.sleep(3)  # 等待前端完全启动
            
            # 6. 打开浏览器
            self.open_browser()
            
            # 7. 显示成功信息
            print(f"\n{Colors.OKGREEN}{'='*60}")
            print("🎉 OA系统启动成功！")
            print(f"{'='*60}")
            print(f"📱 前端地址: {self.config['frontend_url']}")
            print(f"🔧 后端地址: {self.config['backend_url']}")
            print(f"🗄️  数据库端口: {self.config['mongodb_port']}")
            print("📝 按 Ctrl+C 退出程序")
            print(f"{'='*60}{Colors.ENDC}")
            
            # 8. 保持运行
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass
            
        except Exception as e:
            self.print_status(f"启动过程中发生错误: {e}", "ERROR")
            return False
        finally:
            self.cleanup()

def main():
    """主函数"""
    launcher = OASystemLauncher()
    success = launcher.run()
    
    if not success:
        print(f"\n{Colors.FAIL}❌ OA系统启动失败{Colors.ENDC}")
        print(f"{Colors.WARNING}请检查错误信息并重试{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
