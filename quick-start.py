#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SkillUp Platform 一键启动程序

功能说明：
- 检查并安装必要的Python依赖
- 检查Node.js环境和npm依赖
- 启动开发服务器
- 自动打开默认浏览器
- 提供友好的控制台输出和错误处理
- 支持优雅退出

作者：SOLO Coding
版本：1.0.0
"""

import os
import sys
import subprocess
import time
import webbrowser
import signal
import threading
from pathlib import Path

# 全局变量
dev_server_process = None
server_started = False

def print_banner():
    """
    打印程序启动横幅
    
    功能：显示程序名称和版本信息
    参数：无
    返回值：无
    示例：print_banner()
    """
    print("\n" + "="*60)
    print("    SkillUp Platform 一键启动程序")
    print("    版本：1.0.0")
    print("    支持：Windows 操作系统")
    print("="*60 + "\n")

def check_python_dependencies():
    """
    检查并安装必要的Python依赖
    
    功能：检查requests等必要的Python包，如果缺失则自动安装
    参数：无
    返回值：bool - 依赖检查和安装是否成功
    示例：success = check_python_dependencies()
    """
    print("[1/5] 检查Python依赖...")
    
    required_packages = ['requests', 'psutil']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✓ {package} 已安装")
        except ImportError:
            missing_packages.append(package)
            print(f"  ✗ {package} 未安装")
    
    if missing_packages:
        print(f"\n正在安装缺失的依赖: {', '.join(missing_packages)}")
        try:
            for package in missing_packages:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
                print(f"  ✓ {package} 安装成功")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ 依赖安装失败: {e}")
            return False
    
    print("  ✓ Python依赖检查完成\n")
    return True

def check_nodejs_environment():
    """
    检查Node.js环境
    
    功能：检查Node.js和npm是否已安装并可用
    参数：无
    返回值：bool - Node.js环境是否可用
    示例：success = check_nodejs_environment()
    """
    print("[2/5] 检查Node.js环境...")
    
    try:
        # 检查Node.js版本
        node_result = subprocess.run(['node', '--version'], 
                                   capture_output=True, text=True, check=True, shell=True)
        node_version = node_result.stdout.strip()
        print(f"  ✓ Node.js版本: {node_version}")
        
        # 检查npm版本
        npm_result = subprocess.run(['npm', '--version'], 
                                  capture_output=True, text=True, check=True, shell=True)
        npm_version = npm_result.stdout.strip()
        print(f"  ✓ npm版本: {npm_version}")
        
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"  ✗ Node.js环境检查失败: {e}")
        print("  请确保已安装Node.js和npm")
        return False
    
    print("  ✓ Node.js环境检查完成\n")
    return True

def install_npm_dependencies():
    """
    安装npm依赖
    
    功能：检查package.json并安装项目依赖
    参数：无
    返回值：bool - npm依赖安装是否成功
    示例：success = install_npm_dependencies()
    """
    print("[3/5] 检查npm依赖...")
    
    # 检查package.json是否存在
    if not Path('package.json').exists():
        print("  ✗ package.json文件不存在")
        return False
    
    # 检查node_modules是否存在
    if not Path('node_modules').exists():
        print("  正在安装npm依赖...")
        try:
            subprocess.run(['npm', 'install'], check=True, shell=True)
            print("  ✓ npm依赖安装完成")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ npm依赖安装失败: {e}")
            return False
    else:
        print("  ✓ npm依赖已存在")
    
    print("  ✓ npm依赖检查完成\n")
    return True

def start_dev_server():
    """
    启动开发服务器
    
    功能：使用npm run dev启动开发服务器
    参数：无
    返回值：subprocess.Popen - 服务器进程对象，如果启动失败则返回None
    示例：process = start_dev_server()
    """
    global dev_server_process
    
    print("[4/5] 启动开发服务器...")
    
    try:
        # 启动开发服务器
        dev_server_process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        
        print("  ✓ 开发服务器启动中...")
        return dev_server_process
        
    except Exception as e:
        print(f"  ✗ 开发服务器启动失败: {e}")
        return None

def wait_for_server(timeout=60):
    """
    等待服务器启动完成
    
    功能：检查服务器是否在指定端口启动成功
    参数：
        timeout (int): 超时时间（秒），默认60秒
    返回值：bool - 服务器是否启动成功
    示例：success = wait_for_server(30)
    """
    global server_started, dev_server_process
    
    print("  等待服务器启动...")
    
    import requests
    
    start_time = time.time()
    attempt = 0
    while time.time() - start_time < timeout:
        attempt += 1
        
        # 检查进程是否还在运行
        if dev_server_process and dev_server_process.poll() is not None:
            print(f"  ✗ 开发服务器进程已退出，退出码: {dev_server_process.returncode}")
            return False
        
        try:
            response = requests.get('http://localhost:3000', timeout=3)
            if response.status_code == 200:
                server_started = True
                print("  ✓ 服务器启动成功")
                return True
        except requests.exceptions.RequestException as e:
            if attempt % 5 == 0:  # 每5次尝试打印一次状态
                print(f"  . 等待中... (尝试 {attempt}, 错误: {type(e).__name__})")
        
        time.sleep(2)
    
    print(f"  ✗ 服务器启动超时（{timeout}秒）")
    return False

def open_browser():
    """
    打开默认浏览器
    
    功能：自动打开默认浏览器访问应用
    参数：无
    返回值：bool - 浏览器是否成功打开
    示例：success = open_browser()
    """
    print("[5/5] 打开浏览器...")
    
    try:
        webbrowser.open('http://localhost:3000')
        print("  ✓ 浏览器已打开")
        print("  访问地址: http://localhost:3000")
        return True
    except Exception as e:
        print(f"  ✗ 浏览器打开失败: {e}")
        print("  请手动访问: http://localhost:3000")
        return False

def signal_handler(signum, frame):
    """
    信号处理函数
    
    功能：处理Ctrl+C等中断信号，优雅退出程序
    参数：
        signum (int): 信号编号
        frame: 当前栈帧
    返回值：无
    示例：signal.signal(signal.SIGINT, signal_handler)
    """
    global dev_server_process
    
    print("\n\n收到退出信号，正在关闭服务器...")
    
    if dev_server_process:
        try:
            if os.name == 'nt':  # Windows
                dev_server_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:  # Unix/Linux
                dev_server_process.terminate()
            
            # 等待进程结束
            dev_server_process.wait(timeout=10)
            print("✓ 服务器已关闭")
        except Exception as e:
            print(f"✗ 服务器关闭失败: {e}")
            try:
                dev_server_process.kill()
                print("✓ 强制关闭服务器")
            except:
                pass
    
    print("程序已退出")
    sys.exit(0)

def monitor_server():
    """
    监控服务器状态
    
    功能：在后台监控开发服务器的运行状态
    参数：无
    返回值：无
    示例：threading.Thread(target=monitor_server, daemon=True).start()
    """
    global dev_server_process, server_started
    
    while dev_server_process and dev_server_process.poll() is None:
        time.sleep(1)
    
    if server_started:
        print("\n⚠️  开发服务器意外停止")
        print("请检查控制台输出或重新启动程序")

def main():
    """
    主函数
    
    功能：程序入口点，协调各个功能模块的执行
    参数：无
    返回值：int - 程序退出码（0表示成功，1表示失败）
    示例：exit_code = main()
    """
    global dev_server_process
    
    # 设置信号处理
    signal.signal(signal.SIGINT, signal_handler)
    if os.name == 'nt':  # Windows
        signal.signal(signal.SIGBREAK, signal_handler)
    
    try:
        # 打印启动横幅
        print_banner()
        
        # 检查当前工作目录
        if not Path('package.json').exists():
            print("错误：请在项目根目录下运行此脚本")
            return 1
        
        # 步骤1：检查Python依赖
        if not check_python_dependencies():
            return 1
        
        # 步骤2：检查Node.js环境
        if not check_nodejs_environment():
            return 1
        
        # 步骤3：安装npm依赖
        if not install_npm_dependencies():
            return 1
        
        # 步骤4：启动开发服务器
        if not start_dev_server():
            return 1
        
        # 启动服务器监控线程
        monitor_thread = threading.Thread(target=monitor_server, daemon=True)
        monitor_thread.start()
        
        # 等待服务器启动
        if not wait_for_server():
            return 1
        
        # 步骤5：打开浏览器
        open_browser()
        
        print("\n" + "="*60)
        print("🎉 SkillUp Platform 启动成功！")
        print("")
        print("📱 访问地址: http://localhost:3000")
        print("⌨️  按 Ctrl+C 退出程序")
        print("="*60 + "\n")
        
        # 保持程序运行
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            signal_handler(signal.SIGINT, None)
        
    except Exception as e:
        print(f"\n❌ 程序运行出错: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)